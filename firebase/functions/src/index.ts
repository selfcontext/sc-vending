import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Simple in-memory rate limiter using Firestore
 * For production, consider using Redis or Firebase Extensions Rate Limiter
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<void> {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (limit && now < limit.resetAt) {
    if (limit.count >= maxRequests) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many requests. Please try again later.'
      );
    }
    limit.count++;
  } else {
    rateLimits.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
  }

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimits.entries()) {
      if (now >= v.resetAt) {
        rateLimits.delete(k);
      }
    }
  }
}

/**
 * Create a new session for a vending machine
 * Called when vending machine starts or QR code needs refresh
 */
export const createSession = functions.https.onCall(async (data, context) => {
  const { vendingMachineId } = data;

  if (!vendingMachineId) {
    throw new functions.https.HttpsError('invalid-argument', 'vendingMachineId is required');
  }

  // Rate limit: 10 sessions per machine per minute
  await checkRateLimit(`session_${vendingMachineId}`, 10, 60);

  try {
    // Get config for session timeout
    const configDoc = await db.collection('config').doc('app').get();
    const config = configDoc.data() || {};
    const sessionTimeoutMinutes = config.sessionTimeoutMinutes || 3;

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + sessionTimeoutMinutes * 60 * 1000
    );

    const sessionData = {
      vendingMachineId,
      status: 'active',
      basket: [],
      payments: [],
      totalAmount: 0,
      dispensedItems: [],
      createdAt: now,
      expiresAt,
      qrCodeData: '', // Will be set after creation
    };

    const sessionRef = await db.collection('sessions').add(sessionData);

    // Update QR code data with session ID
    const qrCodeData = `${process.env.CLIENT_URL || 'https://your-app.web.app'}/session/${sessionRef.id}`;
    await sessionRef.update({ qrCodeData });

    // Create SessionCreated event
    await db.collection('events').add({
      type: 'SessionCreated',
      sessionId: sessionRef.id,
      vendingMachineId,
      payload: { sessionId: sessionRef.id },
      timestamp: now,
      processed: false,
    });

    // Update vending machine's current session
    await db.collection('vendingMachines').doc(vendingMachineId).set(
      {
        currentSessionId: sessionRef.id,
        lastHeartbeat: now,
      },
      { merge: true }
    );

    return {
      sessionId: sessionRef.id,
      qrCodeData,
      expiresAt: expiresAt.toMillis(),
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create session');
  }
});

/**
 * Process payment completion
 * Called when payment is successfully processed
 */
export const processPayment = functions.https.onCall(async (data, context) => {
  const { sessionId, transactionId, amount } = data;

  if (!sessionId || !transactionId || amount === undefined) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'sessionId, transactionId, and amount are required'
    );
  }

  try {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data()!;
    const now = admin.firestore.Timestamp.now();

    // VALIDATION: Check if session is already completed (prevent double payment)
    if (session.status === 'completed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Payment already processed for this session'
      );
    }

    // VALIDATION: Check if session is still active
    if (session.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Session is not active'
      );
    }

    // VALIDATION: Check if basket is empty
    if (!session.basket || session.basket.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Cannot process payment for empty basket'
      );
    }

    // VALIDATION: Verify amount matches session total
    if (amount !== session.totalAmount) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Amount mismatch: expected ${session.totalAmount}, got ${amount}`
      );
    }

    // VALIDATION: Check inventory stock for all items before processing payment
    for (const item of session.basket) {
      const inventoryQuery = await db.collection('inventory')
        .where('slot', '==', item.slot)
        .limit(1)
        .get();

      if (inventoryQuery.empty) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Product in slot ${item.slot} not found in inventory`
        );
      }

      const inventoryData = inventoryQuery.docs[0].data();
      if (inventoryData.quantity < item.quantity) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Insufficient stock for ${item.productName}: requested ${item.quantity}, available ${inventoryData.quantity}`
        );
      }
    }

    // Use batch to atomically create all events (prevents partial event creation on crash)
    const batch = db.batch();

    // Update session with payment
    batch.update(sessionRef, {
      status: 'completed',
      completedAt: now,
    });

    // Create PaymentReceived event
    const paymentEventRef = db.collection('events').doc();
    batch.set(paymentEventRef, {
      type: 'PaymentReceived',
      sessionId,
      vendingMachineId: session.vendingMachineId,
      payload: { transactionId, amount },
      timestamp: now,
      processed: false,
    });

    // Create ProductDispatch events for each item in basket
    // Use sequenceNumber to ensure deterministic ordering even with same timestamp
    let sequenceNumber = 0;
    for (const item of session.basket) {
      for (let i = 0; i < item.quantity; i++) {
        const dispatchEventRef = db.collection('events').doc();
        batch.set(dispatchEventRef, {
          type: 'ProductDispatch',
          sessionId,
          vendingMachineId: session.vendingMachineId,
          payload: {
            productId: item.productId,
            productName: item.productName,
            slot: item.slot,
            price: item.price,
          },
          timestamp: now,
          sequenceNumber: sequenceNumber++,
          processed: false,
        });
      }
    }

    // Commit all changes atomically
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error processing payment:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to process payment');
  }
});

/**
 * Confirm product dispense
 * Called by vending machine after successfully dispensing a product
 */
export const confirmDispense = functions.https.onCall(async (data, context) => {
  const { sessionId, productId, slot, success, eventId } = data;

  if (!sessionId || !productId || success === undefined) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'sessionId, productId, and success are required'
    );
  }

  // VALIDATION: Validate slot is a valid number within expected range (0-99 for typical vending machines)
  if (slot === undefined || typeof slot !== 'number' || slot < 0 || slot > 99 || !Number.isInteger(slot)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid slot number: must be an integer between 0 and 99'
    );
  }

  try {
    // IDEMPOTENCY: Check if event was already processed to prevent duplicate processing
    if (eventId) {
      const eventDoc = await db.collection('events').doc(eventId).get();
      if (eventDoc.exists && eventDoc.data()?.processed === true) {
        console.log(`Event ${eventId} already processed, skipping`);
        return { success: true, alreadyProcessed: true };
      }
    }

    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data()!;
    const now = admin.firestore.Timestamp.now();

    const dispensedItem = {
      productId,
      slot,
      status: success ? 'dispensed' : 'failed',
      timestamp: now,
    };

    // Use batch to ensure atomic operations
    const batch = db.batch();

    // Update session with dispensed item
    batch.update(sessionRef, {
      dispensedItems: admin.firestore.FieldValue.arrayUnion(dispensedItem),
    });

    // Mark event as processed
    if (eventId) {
      batch.update(db.collection('events').doc(eventId), {
        processed: true,
      });
    }

    await batch.commit();

    // Create success/failed event
    await db.collection('events').add({
      type: success ? 'DispenseSuccess' : 'DispenseFailed',
      sessionId,
      vendingMachineId: session.vendingMachineId,
      payload: { productId, slot },
      timestamp: now,
      processed: false,
    });

    // If dispense failed, create a RefundRequested event for audit trail and refund processing
    if (!success) {
      const basketItem = session.basket.find((item: { productId: string; productName: string; price: number; slot: number; quantity: number }) => item.productId === productId);

      if (!basketItem) {
        console.error(`Product ${productId} not found in basket for session ${sessionId}`);
        throw new functions.https.HttpsError(
          'not-found',
          `Product ${productId} not found in session basket`
        );
      }

      const refundAmount = basketItem.price;

      await db.collection('events').add({
        type: 'RefundRequested',
        sessionId,
        vendingMachineId: session.vendingMachineId,
        payload: {
          productId,
          productName: basketItem.productName,
          slot,
          refundAmount,
          reason: 'dispense_failed',
        },
        timestamp: now,
        processed: false,
      });

      // Log the refund request for processing
      await db.collection('transactionLogs').add({
        type: 'refund_requested',
        sessionId,
        vendingMachineId: session.vendingMachineId,
        details: {
          productId,
          productName: basketItem.productName,
          refundAmount,
          reason: 'dispense_failed',
        },
        timestamp: now,
      });
    }

    // Update inventory
    if (success) {
      const inventoryQuery = await db.collection('inventory')
        .where('slot', '==', slot)
        .limit(1)
        .get();

      if (!inventoryQuery.empty) {
        const inventoryDoc = inventoryQuery.docs[0];
        const currentQuantity = inventoryDoc.data().quantity;

        // VALIDATION: Ensure inventory doesn't go negative
        if (currentQuantity <= 0) {
          console.error(`Inventory for slot ${slot} already at 0, cannot decrement`);
          // Don't throw error since dispense was successful, just log warning
        } else {
          await inventoryDoc.ref.update({
            quantity: admin.firestore.FieldValue.increment(-1),
            updatedAt: now,
          });

          // Check if stock is low
          const newQuantity = currentQuantity - 1;
          if (newQuantity <= 5 && newQuantity > 0) {
            await db.collection('events').add({
              type: 'StockLow',
              sessionId,
              vendingMachineId: session.vendingMachineId,
              payload: { productId: inventoryDoc.id, quantity: newQuantity },
              timestamp: now,
              processed: false,
            });
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error confirming dispense:', error);
    throw new functions.https.HttpsError('internal', 'Failed to confirm dispense');
  }
});

/**
 * Scheduled function to expire old sessions
 * Runs every 5 minutes
 */
export const expireSessions = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    try {
      const expiredSessions = await db
        .collection('sessions')
        .where('status', '==', 'active')
        .where('expiresAt', '<=', now)
        .get();

      const batch = db.batch();

      expiredSessions.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'expired' });

        // Create SessionExpired event
        const eventRef = db.collection('events').doc();
        batch.set(eventRef, {
          type: 'SessionExpired',
          sessionId: doc.id,
          vendingMachineId: doc.data().vendingMachineId,
          payload: { sessionId: doc.id },
          timestamp: now,
          processed: false,
        });
      });

      await batch.commit();

      console.log(`Expired ${expiredSessions.size} sessions`);
      return null;
    } catch (error) {
      console.error('Error expiring sessions:', error);
      return null;
    }
  });

/**
 * Clean up old events (older than 7 days)
 * Runs daily at midnight
 */
export const cleanupOldEvents = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    try {
      const oldEvents = await db
        .collection('events')
        .where('timestamp', '<=', sevenDaysAgo)
        .where('processed', '==', true)
        .limit(500)
        .get();

      if (oldEvents.empty) {
        console.log('No old events to clean up');
        return null;
      }

      const batch = db.batch();
      oldEvents.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Deleted ${oldEvents.size} old events`);
      return null;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      return null;
    }
  });

/**
 * Update vending machine heartbeat
 */
export const updateHeartbeat = functions.https.onCall(async (data, context) => {
  const { vendingMachineId } = data;

  if (!vendingMachineId) {
    throw new functions.https.HttpsError('invalid-argument', 'vendingMachineId is required');
  }

  try {
    await db.collection('vendingMachines').doc(vendingMachineId).update({
      lastHeartbeat: admin.firestore.Timestamp.now(),
      status: 'online',
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update heartbeat');
  }
});

/**
 * Extend session expiry time
 * Can only be extended once per session
 */
export const extendSession = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;

  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
  }

  // Rate limit: 2 extensions per session (extra safety, though limited to 1 in logic)
  await checkRateLimit(`extend_${sessionId}`, 2, 300);

  try {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data()!;

    // Check if already extended
    if (session.extendedCount && session.extendedCount >= 1) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Session has already been extended'
      );
    }

    // Check if session is still active
    if (session.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Session is not active'
      );
    }

    // Get config for session timeout
    const configDoc = await db.collection('config').doc('app').get();
    const config = configDoc.data() || {};
    const sessionTimeoutMinutes = config.sessionTimeoutMinutes || 3;

    const now = admin.firestore.Timestamp.now();
    const newExpiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + sessionTimeoutMinutes * 60 * 1000
    );

    await sessionRef.update({
      expiresAt: newExpiresAt,
      extendedCount: (session.extendedCount || 0) + 1,
    });

    // Log the extension
    await db.collection('transactionLogs').add({
      type: 'session_extended',
      sessionId,
      vendingMachineId: session.vendingMachineId,
      details: {
        oldExpiresAt: session.expiresAt,
        newExpiresAt,
        extendedCount: (session.extendedCount || 0) + 1,
      },
      timestamp: now,
    });

    return {
      success: true,
      newExpiresAt: newExpiresAt.toMillis(),
    };
  } catch (error) {
    console.error('Error extending session:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to extend session');
  }
});

/**
 * Monitor inventory changes and send low stock notifications
 * Triggered when inventory quantity is updated
 */
export const monitorLowStock = functions.firestore
  .document('inventory/{productId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if quantity decreased and is now at or below threshold
    if (after.quantity <= 3 && before.quantity > after.quantity) {
      const productId = context.params.productId;

      // TODO: Implement your notification logic here
      // Options:
      // 1. Send email via SendGrid/Mailgun
      // 2. Send SMS via Twilio
      // 3. Push notification via FCM
      // 4. Slack/Discord webhook
      // 5. Create an alert in admin dashboard

      console.log(`LOW STOCK ALERT: Product ${after.name} (${productId}) has ${after.quantity} items left`);

      // Create a low stock event
      await db.collection('events').add({
        type: 'StockLow',
        sessionId: '',
        vendingMachineId: after.vendingMachineId,
        payload: {
          productId,
          productName: after.name,
          quantity: after.quantity,
          threshold: 3,
        },
        timestamp: admin.firestore.Timestamp.now(),
        processed: false,
      });

      // PLACEHOLDER: Add your notification implementation here
      // Example with email:
      // const nodemailer = require('nodemailer');
      // await sendLowStockEmail(after.name, after.quantity);

      // Example with Twilio SMS:
      // const twilio = require('twilio');
      // await sendLowStockSMS(after.name, after.quantity);
    }

    return null;
  });

/**
 * Manual dispense test function
 * For admin testing only
 */
export const manualDispenseTest = functions.https.onCall(async (data, context) => {
  // Check if user is admin (not anonymous)
  if (!context.auth || context.auth.token.firebase.sign_in_provider === 'anonymous') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can perform manual dispense tests'
    );
  }

  const { vendingMachineId, productId, slot } = data;

  if (!vendingMachineId || !productId || slot === undefined) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'vendingMachineId, productId, and slot are required'
    );
  }

  try {
    const now = admin.firestore.Timestamp.now();

    // Create a test ProductDispatch event
    const eventRef = await db.collection('events').add({
      type: 'ProductDispatch',
      sessionId: 'manual_test',
      vendingMachineId,
      payload: {
        productId,
        productName: 'Test Product',
        slot,
        price: 0,
        isTest: true,
      },
      timestamp: now,
      processed: false,
    });

    // Log the test
    await db.collection('transactionLogs').add({
      type: 'product_dispensed',
      userId: context.auth.uid,
      vendingMachineId,
      details: {
        productId,
        slot,
        isTest: true,
        eventId: eventRef.id,
      },
      timestamp: now,
    });

    return {
      success: true,
      eventId: eventRef.id,
      message: 'Test dispense event created. Check vending machine for dispensing.',
    };
  } catch (error) {
    console.error('Error creating manual dispense test:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create test dispense');
  }
});
