#!/usr/bin/env node

/**
 * Admin Reset Script - Uses Firebase Admin SDK for authenticated access
 * This script can clear Firestore sessions with proper authentication
 * 
 * Setup:
 * 1. Download service account key from Firebase Console
 * 2. Save as service-account-key.json in project root
 * 3. Run: npm run admin-reset
 */

import admin from 'firebase-admin';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper function to print colored text
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check for service account file
const serviceAccountPath = path.join(__dirname, '../service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
  print('\n❌ Service account key not found!', 'red');
  print('\nTo use admin reset functionality:', 'yellow');
  print('1. Go to Firebase Console → Project Settings → Service Accounts', 'cyan');
  print('2. Click "Generate new private key"', 'cyan');
  print('3. Save the JSON file as "service-account-key.json" in the project root', 'cyan');
  print('4. Add service-account-key.json to .gitignore (security!)', 'cyan');
  print('\nAlternatively, use the regular reset script:', 'yellow');
  print('  npm run reset-queue', 'cyan');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
});

const db = admin.database();
const firestore = admin.firestore();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for user confirmation
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Get current statistics
async function getStatistics() {
  try {
    // Get Realtime Database stats
    const queueSnapshot = await db.ref('queue').once('value');
    const queueData = queueSnapshot.val() || {};
    
    const stats = {
      hasActiveUser: !!queueData.activeUser,
      waitingUsersCount: queueData.waitingUsers ? Object.keys(queueData.waitingUsers).length : 0,
      queueLength: queueData.queueLength || 0
    };
    
    // Get Firestore session count
    const sessionsSnapshot = await firestore.collection('sessions').get();
    stats.sessionCount = sessionsSnapshot.size;
    
    return stats;
  } catch (error) {
    console.error('Error getting statistics:', error);
    return null;
  }
}

// Clear Realtime Database
async function clearRealtimeDatabase() {
  print('\n📱 Clearing Realtime Database...', 'yellow');
  
  try {
    // Clear queue
    await db.ref('queue').remove();
    print('  ✅ Queue cleared', 'green');
            
    // Clear system state
    await db.ref('systemState').remove();
    print('  ✅ System state cleared', 'green');
    
    // Clear sessions
    await db.ref('sessions').remove();
    print('  ✅ Realtime Database sessions cleared', 'green');
    
  } catch (error) {
    print(`  ❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

// Clear Firestore
async function clearFirestore() {
  print('\n🗄️  Clearing Firestore...', 'yellow');
  
  try {
    // Get all sessions
    const sessionsSnapshot = await firestore.collection('sessions').get();
    
    if (sessionsSnapshot.empty) {
      print('  ℹ️  No sessions to clear', 'cyan');
      return;
    }
    
    // Delete in batches for efficiency
    const batch = firestore.batch();
    let count = 0;
    
    sessionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
      
      // Firestore has a limit of 500 operations per batch
      if (count % 500 === 0) {
        print(`  Processing batch (${count} documents)...`, 'cyan');
      }
    });
    
    await batch.commit();
    print(`  ✅ ${count} session summaries cleared from Firestore`, 'green');
    
  } catch (error) {
    print(`  ❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

// Initialize empty queue structure
async function initializeEmptyQueue() {
  print('\n🎯 Initializing empty queue structure...', 'yellow');
  
  try {
    await db.ref('queue').set({
      activeUser: null,
      waitingUsers: {},
      queueLength: 0
    });
    print('  ✅ Empty queue structure initialized', 'green');
  } catch (error) {
    print(`  ❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

// Main admin reset function
async function adminReset(options = {}) {
  try {
    print('\n🔐 Admin Reset (Authenticated)', 'magenta');
    print('Using service account authentication', 'cyan');
    
    if (options.clearRealtimeDb) {
      await clearRealtimeDatabase();
    }
    
    if (options.clearFirestore) {
      await clearFirestore();
    }
    
    if (options.initialize) {
      await initializeEmptyQueue();
    }
    
    print('\n✨ Admin reset completed successfully!', 'green');
    
  } catch (error) {
    print(`\n❌ Admin reset failed: ${error.message}`, 'red');
    throw error;
  }
}

// Interactive CLI
async function interactiveCLI() {
  print('\n═══════════════════════════════════════════════', 'magenta');
  print('   TouchDesigner Admin Reset Tool (Authenticated)   ', 'magenta');
  print('═══════════════════════════════════════════════', 'magenta');
  
  // Get current statistics
  print('\n📊 Current Statistics:', 'blue');
  const stats = await getStatistics();
  
  if (stats) {
    print(`   • Active user: ${stats.hasActiveUser ? 'Yes' : 'No'}`, 'cyan');
    print(`   • Waiting users: ${stats.waitingUsersCount}`, 'cyan');
    print(`   • Queue length: ${stats.queueLength}`, 'cyan');
    print(`   • Firestore sessions: ${stats.sessionCount}`, 'cyan');
  } else {
    print('   Unable to retrieve statistics', 'yellow');
  }
  
  // Show options
  print('\n🎯 Admin Reset Options:', 'blue');
  print('   1. Full reset (clear everything)', 'cyan');
  print('   2. Clear Firestore sessions only', 'cyan');
  print('   3. Clear Realtime Database only', 'cyan');
  print('   4. Exit', 'cyan');
  
  const choice = await askQuestion('\nSelect an option (1-4): ');
  
  switch (choice) {
    case '1':
      // Full reset
      print('\n🔥 Full Admin Reset Selected', 'yellow');
      print('⚠️  This will delete ALL data from both databases!', 'red');
      const confirm1 = await askQuestion('Type "DELETE ALL" to confirm: ');
      if (confirm1 === 'DELETE ALL') {
        await adminReset({
          clearRealtimeDb: true,
          clearFirestore: true,
          initialize: true
        });
      } else {
        print('Reset cancelled', 'yellow');
      }
      break;
      
    case '2':
      // Firestore only
      print('\n🗄️  Clear Firestore Sessions Selected', 'yellow');
      const confirm2 = await askQuestion('This will delete all Firestore session summaries. Continue? (y/n): ');
      if (confirm2.toLowerCase() === 'y') {
        await adminReset({
          clearFirestore: true
        });
      } else {
        print('Reset cancelled', 'yellow');
      }
      break;
      
    case '3':
      // Realtime Database only
      print('\n📱 Clear Realtime Database Selected', 'yellow');
      const confirm3 = await askQuestion('This will clear the queue and related data. Continue? (y/n): ');
      if (confirm3.toLowerCase() === 'y') {
        await adminReset({
          clearRealtimeDb: true,
          initialize: true
        });
      } else {
        print('Reset cancelled', 'yellow');
      }
      break;
      
    case '4':
      print('Exiting...', 'cyan');
      break;
      
    default:
      print('Invalid option selected', 'red');
  }
  
  rl.close();
  process.exit(0);
}

// Check for command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  print('\nUsage: node admin-reset.js [options]', 'cyan');
  print('\nOptions:', 'cyan');
  print('  --full        Full reset (clear everything)', 'cyan');
  print('  --firestore   Clear Firestore sessions only', 'cyan');
  print('  --realtime    Clear Realtime Database only', 'cyan');
  print('  --force       Skip confirmation prompts', 'cyan');
  print('  --help        Show this help message', 'cyan');
  print('\nRequires service-account-key.json for authentication', 'yellow');
  process.exit(0);
}

// Handle command line options
if (args.includes('--full')) {
  const force = args.includes('--force');
  if (force) {
    adminReset({
      clearRealtimeDb: true,
      clearFirestore: true,
      initialize: true
    }).then(() => process.exit(0));
  } else {
    print('⚠️  Full reset will delete ALL data from both databases!', 'red');
    rl.question('Type "DELETE ALL" to confirm: ', (answer) => {
      if (answer === 'DELETE ALL') {
        adminReset({
          clearRealtimeDb: true,
          clearFirestore: true,
          initialize: true
        }).then(() => {
          rl.close();
          process.exit(0);
        });
      } else {
        print('Reset cancelled', 'yellow');
        rl.close();
        process.exit(0);
      }
    });
  }
} else if (args.includes('--firestore')) {
  const force = args.includes('--force');
  if (force) {
    adminReset({ clearFirestore: true }).then(() => process.exit(0));
  } else {
    rl.question('Clear all Firestore sessions? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        adminReset({ clearFirestore: true }).then(() => {
          rl.close();
          process.exit(0);
        });
      } else {
        print('Reset cancelled', 'yellow');
        rl.close();
        process.exit(0);
      }
    });
  }
} else if (args.includes('--realtime')) {
  const force = args.includes('--force');
  if (force) {
    adminReset({
      clearRealtimeDb: true,
      initialize: true
    }).then(() => process.exit(0));
  } else {
    rl.question('Clear Realtime Database? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        adminReset({
          clearRealtimeDb: true,
          initialize: true
        }).then(() => {
          rl.close();
          process.exit(0);
        });
      } else {
        print('Reset cancelled', 'yellow');
        rl.close();
        process.exit(0);
      }
    });
  }
} else {
  // Run interactive CLI
  interactiveCLI();
}
