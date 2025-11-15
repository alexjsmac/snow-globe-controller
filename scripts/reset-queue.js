#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove, get, set, serverTimestamp } from 'firebase/database';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';
import readline from 'readline';

// Load environment variables
import * as dotenv from 'dotenv';
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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const realtimeDb = getDatabase(app);
const firestore = getFirestore(app);

// Create readline interface for user input
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

// Helper function to print colored text
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get current queue statistics
async function getQueueStats() {
  try {
    const queueRef = ref(realtimeDb, 'queue');
    const snapshot = await get(queueRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.val();
    const stats = {
      hasActiveUser: !!data.activeUser,
      waitingUsersCount: data.waitingUsers ? Object.keys(data.waitingUsers).length : 0,
      queueLength: data.queueLength || 0
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
}

// Get Firestore session count
async function getSessionCount() {
  try {
    const sessionsRef = collection(firestore, 'sessions');
    const snapshot = await getDocs(sessionsRef);
    return snapshot.size;
  } catch (error) {
    // Permission errors are expected since Firestore requires authentication
    if (error.code === 'permission-denied') {
      return 'N/A (requires auth)';
    }
    console.error('Error getting session count:', error.message);
    return 'error';
  }
}

// Clear queue in Realtime Database
async function clearRealtimeQueue() {
  print('  Clearing queue data...', 'cyan');
  const queueRef = ref(realtimeDb, 'queue');
  await remove(queueRef);
  print('  ✅ Queue data cleared', 'green');
}

// Clear system state
async function clearSystemState() {
  print('  Clearing system state...', 'cyan');
  try {
    const systemRef = ref(realtimeDb, 'systemState');
    await remove(systemRef);
    print('  ✅ System state cleared', 'green');
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      print('  ⚠️  Cannot clear system state - authentication required', 'yellow');
      print('     System state is managed by authenticated services only', 'yellow');
    } else {
      throw error;
    }
  }
}

// Clear sessions from Realtime Database
async function clearRealtimeSessions() {
  print('  Clearing Realtime Database sessions...', 'cyan');
  const sessionsRef = ref(realtimeDb, 'sessions');
  await remove(sessionsRef);
  print('  ✅ Realtime Database sessions cleared', 'green');
}

// Clear sessions from Firestore
async function clearFirestoreSessions() {
  print('  Clearing Firestore session summaries...', 'cyan');
  try {
    const sessionsRef = collection(firestore, 'sessions');
    const snapshot = await getDocs(sessionsRef);
    
    let count = 0;
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
      count++;
      if (count % 10 === 0) {
        print(`    Deleted ${count}/${snapshot.size} sessions...`, 'cyan');
      }
    }
    
    print(`  ✅ ${count} Firestore session summaries cleared`, 'green');
  } catch (error) {
    if (error.code === 'permission-denied') {
      print('  ⚠️  Cannot clear Firestore sessions - authentication required', 'yellow');
      print('     Sessions are write-only from the web app', 'yellow');
      print('     To clear sessions, use Firebase Console or authenticated admin SDK', 'yellow');
    } else {
      print(`  ❌ Error clearing Firestore sessions: ${error.message}`, 'red');
    }
  }
}

// Initialize empty queue structure
async function initializeEmptyQueue() {
  print('  Initializing empty queue structure...', 'cyan');
  const queueRef = ref(realtimeDb, 'queue');
  await set(queueRef, {
    activeUser: "none",
    waitingUsers: {},
    queueLength: 0
  });
  print('  ✅ Empty queue structure initialized', 'green');
}

// Initialize themeValues/current with "none" placeholders so TouchDesigner sees a stable object
async function initializeThemeValues() {
  print('  Initializing themeValues/current...', 'cyan');
  const themeRef = ref(realtimeDb, 'themeValues/current');
  await set(themeRef, {
    row1: "none",
    row2: "none",
    row3: "none",
    sessionId: "none",
    timestamp: serverTimestamp(),
  });
  print('  ✅ themeValues/current initialized', 'green');
}

// Main reset function
async function resetQueue(options = {}) {
  try {
    print('\n🔄 Starting queue reset process...', 'yellow');
    
    // Clear Realtime Database data
    if (options.clearQueue !== false) {
      await clearRealtimeQueue();
    }
    
    if (options.clearSystem !== false) {
      await clearSystemState();
    }
    
    if (options.clearRealtimeSessions) {
      await clearRealtimeSessions();
    }
    
    // Clear Firestore data
    if (options.clearFirestoreSessions) {
      await clearFirestoreSessions();
    }
    
    // Initialize empty structure
    if (options.initialize) {
      await initializeEmptyQueue();
      await initializeThemeValues();
    }
    
    print('\n✨ Queue reset completed successfully!', 'green');
    
  } catch (error) {
    print(`\n❌ Error during reset: ${error.message}`, 'red');
    throw error;
  }
}

// Interactive CLI
async function interactiveCLI() {
  print('\n═══════════════════════════════════════════', 'magenta');
  print('   Queue Reset Tool   ', 'magenta');
  print('═══════════════════════════════════════════', 'magenta');
  
  // Get current statistics
  print('\n📊 Current Queue Statistics:', 'blue');
  const stats = await getQueueStats();
  
  if (stats) {
    print(`   • Active user: ${stats.hasActiveUser ? 'Yes' : 'No'}`, 'cyan');
    print(`   • Waiting users: ${stats.waitingUsersCount}`, 'cyan');
    print(`   • Queue length: ${stats.queueLength}`, 'cyan');
  } else {
    print('   • Queue is empty or not initialized', 'cyan');
  }
  
  const sessionCount = await getSessionCount();
  print(`   • Stored sessions in Firestore: ${sessionCount}`, 'cyan');
  
  // Show reset options
  print('\n🎯 Reset Options:', 'blue');
  print('   1. Quick reset (clear queue only)', 'cyan');
  print('   2. Full reset (clear everything)', 'cyan');
  print('   3. Custom reset (choose what to clear)', 'cyan');
  print('   4. Exit', 'cyan');
  
  const choice = await askQuestion('\nSelect an option (1-4): ');
  
  switch (choice) {
    case '1':
      // Quick reset
      print('\n⚡ Quick Reset Selected', 'yellow');
      const confirm1 = await askQuestion('This will clear the current queue. Continue? (y/n): ');
      if (confirm1.toLowerCase() === 'y') {
        await resetQueue({
          clearQueue: true,
          clearSystem: true,
          clearRealtimeSessions: false,
          clearFirestoreSessions: false,
          initialize: true
        });
      } else {
        print('Reset cancelled', 'yellow');
      }
      break;
      
    case '2':
      // Full reset
      print('\n🔥 Full Reset Selected', 'yellow');
      print('⚠️  WARNING: This will delete ALL data including session history!', 'red');
      const confirm2 = await askQuestion('Are you absolutely sure? (type "yes" to confirm): ');
      if (confirm2.toLowerCase() === 'yes') {
        await resetQueue({
          clearQueue: true,
          clearSystem: true,
          clearRealtimeSessions: true,
          clearFirestoreSessions: true,
          initialize: true
        });
      } else {
        print('Reset cancelled', 'yellow');
      }
      break;
      
    case '3':
      // Custom reset
      print('\n⚙️  Custom Reset Selected', 'yellow');
      const options = {
        clearQueue: false,
        clearSystem: false,
        clearRealtimeSessions: false,
        clearFirestoreSessions: false,
        initialize: false
      };
      
      const q1 = await askQuestion('Clear queue data? (y/n): ');
      options.clearQueue = q1.toLowerCase() === 'y';
      
      const q3 = await askQuestion('Clear system state? (y/n): ');
      options.clearSystem = q3.toLowerCase() === 'y';
      
      const q4 = await askQuestion('Clear Realtime Database sessions? (y/n): ');
      options.clearRealtimeSessions = q4.toLowerCase() === 'y';
      
      const q5 = await askQuestion('Clear Firestore session summaries? (y/n): ');
      options.clearFirestoreSessions = q5.toLowerCase() === 'y';
      
      const q6 = await askQuestion('Initialize empty queue structure? (y/n): ');
      options.initialize = q6.toLowerCase() === 'y';
      
      if (Object.values(options).some(v => v)) {
        await resetQueue(options);
      } else {
        print('No options selected, nothing to reset', 'yellow');
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
  print('\nUsage: node reset-queue.js [options]', 'cyan');
  print('\nOptions:', 'cyan');
  print('  --quick    Quick reset (clear queue only)', 'cyan');
  print('  --full     Full reset (clear everything)', 'cyan');
  print('  --force    Skip confirmation prompts', 'cyan');
  print('  --help     Show this help message', 'cyan');
  print('\nIf no options provided, interactive mode will be used.', 'cyan');
  process.exit(0);
}

// Handle command line options
if (args.includes('--quick')) {
  const force = args.includes('--force');
  if (force) {
    resetQueue({
      clearQueue: true,
      clearSystem: true,
      clearRealtimeSessions: false,
      clearFirestoreSessions: false,
      initialize: true
    }).then(() => process.exit(0));
  } else {
    print('Quick reset will clear the current queue.', 'yellow');
    rl.question('Continue? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        resetQueue({
          clearQueue: true,
          clearSystem: true,
          clearRealtimeSessions: false,
          clearFirestoreSessions: false,
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
} else if (args.includes('--full')) {
  const force = args.includes('--force');
  if (force) {
    resetQueue({
      clearQueue: true,
      clearSystem: true,
      clearRealtimeSessions: true,
      clearFirestoreSessions: true,
      initialize: true
    }).then(() => process.exit(0));
  } else {
    print('⚠️  WARNING: Full reset will delete ALL data including session history!', 'red');
    rl.question('Type "yes" to confirm: ', (answer) => {
      if (answer.toLowerCase() === 'yes') {
        resetQueue({
          clearQueue: true,
          clearSystem: true,
          clearRealtimeSessions: true,
          clearFirestoreSessions: true,
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
