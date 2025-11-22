/**
 * Seed Database Script
 *
 * Usage:
 *   npm run seed
 *
 * This script loads seed data from seed-data.json into Firestore
 * Use this for development and testing
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  console.error('Please set it to the path of your service account JSON file');
  console.error('Example: export GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

interface SeedData {
  config: {
    app: Record<string, any>;
  };
  vendingMachines: Record<string, any>;
  inventory: any[];
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Load seed data
    const seedDataPath = path.join(__dirname, '..', 'seed-data.json');
    const seedDataRaw = fs.readFileSync(seedDataPath, 'utf8');
    const seedData: SeedData = JSON.parse(seedDataRaw);

    // Seed config
    console.log('📝 Seeding configuration...');
    const configRef = db.collection('config').doc('app');
    await configRef.set(seedData.config.app, { merge: true });
    console.log('✅ Configuration seeded\n');

    // Seed vending machines
    console.log('🤖 Seeding vending machines...');
    for (const [machineId, machineData] of Object.entries(seedData.vendingMachines)) {
      const machineRef = db.collection('vendingMachines').doc(machineId);

      // Replace SERVER_TIMESTAMP with actual timestamp
      const data = {
        ...machineData,
        lastHeartbeat: admin.firestore.FieldValue.serverTimestamp(),
      };

      await machineRef.set(data);
      console.log(`  ✓ Created machine: ${machineData.name}`);
    }
    console.log('✅ Vending machines seeded\n');

    // Seed inventory
    console.log('📦 Seeding inventory...');
    for (const product of seedData.inventory) {
      const productData = {
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('inventory').add(productData);
      console.log(`  ✓ Added product: ${product.name} (Slot ${product.slot})`);
    }
    console.log('✅ Inventory seeded\n');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\nSeeded collections:');
    console.log(`  - config: 1 document`);
    console.log(`  - vendingMachines: ${Object.keys(seedData.vendingMachines).length} documents`);
    console.log(`  - inventory: ${seedData.inventory.length} documents`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
