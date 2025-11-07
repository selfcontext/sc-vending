import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Create a new session for a vending machine
 * Called when vending machine starts or QR code needs refresh
 */
export const createSession = functions.https.onCall(async (data, context) => {
  const { vendingMachineId } = data;

  if (!vendingMachineId) {
    throw new functions.https.HttpsError('invalid-argument', 'vendingMachineId is required');
  }

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

  if (!sessionId || !transactionId || !amount) {
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

    // Update session with payment
    await sessionRef.update({
      status: 'completed',
      completedAt: now,
    });

    // Create PaymentReceived event
    await db.collection('events').add({
      type: 'PaymentReceived',
      sessionId,
      vendingMachineId: session.vendingMachineId,
      payload: { transactionId, amount },
      timestamp: now,
      processed: false,
    });

    // Create ProductDispatch events for each item in basket
    for (const item of session.basket) {
      for (let i = 0; i < item.quantity; i++) {
        await db.collection('events').add({
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
          processed: false,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing payment:', error);
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

  try {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const now = admin.firestore.Timestamp.now();

    const dispensedItem = {
      productId,
      slot,
      status: success ? 'dispensed' : 'failed',
      timestamp: now,
    };

    // Update session with dispensed item
    await sessionRef.update({
      dispensedItems: admin.firestore.FieldValue.arrayUnion(dispensedItem),
    });

    // Mark event as processed
    if (eventId) {
      await db.collection('events').doc(eventId).update({
        processed: true,
      });
    }

    // Create success/failed event
    await db.collection('events').add({
      type: success ? 'DispenseSuccess' : 'DispenseFailed',
      sessionId,
      vendingMachineId: (await sessionRef.get()).data()!.vendingMachineId,
      payload: { productId, slot },
      timestamp: now,
      processed: false,
    });

    // Update inventory
    if (success) {
      const inventoryQuery = await db.collection('inventory')
        .where('slot', '==', slot)
        .limit(1)
        .get();

      if (!inventoryQuery.empty) {
        const inventoryDoc = inventoryQuery.docs[0];
        await inventoryDoc.ref.update({
          quantity: admin.firestore.FieldValue.increment(-1),
          updatedAt: now,
        });

        // Check if stock is low
        const newQuantity = inventoryDoc.data().quantity - 1;
        if (newQuantity <= 5 && newQuantity > 0) {
          await db.collection('events').add({
            type: 'StockLow',
            sessionId,
            vendingMachineId: (await sessionRef.get()).data()!.vendingMachineId,
            payload: { productId: inventoryDoc.id, quantity: newQuantity },
            timestamp: now,
            processed: false,
          });
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
