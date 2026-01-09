/**
 * firebase.js - Firebase integration for KIMOJA
 * 
 * This module initializes Firebase Realtime Database for optional cloud sync.
 * Phase 1 (localStorage) remains the primary data source.
 * Firebase provides backup, multi-device sync, and historical backup.
 * 
 * If Firebase fails to load, the app continues working with localStorage only.
 */

let firebase = null;
let database = null;
let isFirebaseReady = false;

// Firebase configuration (from your Firebase console)
const firebaseConfig = {
    apiKey: "AIzaSyAsFb9omjiFm23GeEtGHubTnT_m_Wni8cM",
    authDomain: "kimoja-workforce-manager.firebaseapp.com",
    projectId: "kimoja-workforce-manager",
    storageBucket: "kimoja-workforce-manager.firebasestorage.app",
    messagingSenderId: "299942719994",
    appId: "1:299942719994:web:93ccd8ce79799c90863443",
    measurementId: "G-5CMWV2FBXD"
};

/**
 * Initialize Firebase
 * Loads Firebase SDK asynchronously and initializes Realtime Database
 */
function initializeFirebase() {
    // Check if Firebase is already loaded
    if (window.firebase) {
        try {
            firebase = window.firebase;
            
            // Initialize Firebase app
            const app = firebase.initializeApp(firebaseConfig);
            
            // Get reference to Realtime Database
            database = firebase.database(app);
            
            isFirebaseReady = true;
            console.log('✓ Firebase initialized successfully');
            
            // Optional: Start syncing data
            setupAutoSync();
            
        } catch (error) {
            console.warn('⚠ Firebase initialization failed:', error.message);
            isFirebaseReady = false;
        }
    } else {
        console.warn('⚠ Firebase SDK not loaded. App will use localStorage only.');
    }
}

/**
 * Backup current group data to Firebase
 * Called after major operations (payment, truck added, etc.)
 */
function backupToFirebase(groupName, dataSnapshot) {
    if (!isFirebaseReady || !database) return;
    
    try {
        const backupRef = database.ref(`backups/${groupName}/${new Date().getTime()}`);
        backupRef.set({
            data: dataSnapshot,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            version: "1.0"
        }).catch(err => {
            console.warn('⚠ Backup failed:', err.message);
        });
    } catch (error) {
        console.warn('⚠ Backup error:', error.message);
    }
}

/**
 * Sync localStorage to Firebase (one-way: local → cloud)
 * Called periodically or on major changes
 */
function syncToCloud(groupName) {
    if (!isFirebaseReady || !database) return;
    
    try {
        const key = 'kimoja_' + groupName + '_data';
        const localData = localStorage.getItem(key);
        
        if (localData) {
            const parsedData = JSON.parse(localData);
            const syncRef = database.ref(`groups/${groupName}/latest`);
            
            syncRef.set({
                data: parsedData,
                lastSync: firebase.database.ServerValue.TIMESTAMP
            }).catch(err => {
                console.warn('⚠ Sync failed:', err.message);
            });
        }
    } catch (error) {
        console.warn('⚠ Sync error:', error.message);
    }
}

/**
 * Retrieve backup data from Firebase
 * Used for recovery if local data is corrupted
 */
function restoreFromFirebase(groupName, callback) {
    if (!isFirebaseReady || !database) {
        callback(null, 'Firebase not available');
        return;
    }
    
    try {
        const backupRef = database.ref(`backups/${groupName}`);
        backupRef.orderByChild('timestamp').limitToLast(1).once('value', snapshot => {
            if (snapshot.exists()) {
                const backups = snapshot.val();
                const lastBackup = Object.values(backups)[0];
                callback(lastBackup.data, null);
            } else {
                callback(null, 'No backups found');
            }
        }).catch(err => {
            callback(null, err.message);
        });
    } catch (error) {
        callback(null, error.message);
    }
}

/**
 * Setup automatic sync every 5 minutes
 * Only runs if Firebase is ready
 */
function setupAutoSync() {
    if (!isFirebaseReady) return;
    
    const groups = ['ELITE', 'NGORONYO', 'SHERIF', 'SCORPION', 'ACHIEVERS', 'MWEA'];
    
    // Sync every 5 minutes
    setInterval(() => {
        groups.forEach(group => {
            syncToCloud(group);
        });
        console.log('☁ Auto-sync completed');
    }, 5 * 60 * 1000);
}

/**
 * Manual sync trigger (can be called from UI)
 */
function syncNow(groupName) {
    if (!isFirebaseReady) {
        alert('Firebase not available. Using localStorage only.');
        return;
    }
    syncToCloud(groupName);
    alert('Synced to cloud!');
}

/**
 * Check Firebase status
 */
function getFirebaseStatus() {
    return {
        ready: isFirebaseReady,
        database: database ? 'connected' : 'disconnected'
    };
}

// Load Firebase SDK from CDN
(function loadFirebaseSDK() {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    script.onload = function() {
        const script2 = document.createElement('script');
        script2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
        script2.onload = function() {
            // Call init after Firebase is loaded
            setTimeout(initializeFirebase, 100);
        };
        script2.onerror = function() {
            console.warn('⚠ Failed to load Firebase Database SDK');
        };
        document.head.appendChild(script2);
    };
    script.onerror = function() {
        console.warn('⚠ Failed to load Firebase SDK. App will work with localStorage only.');
    };
    document.head.appendChild(script);
})();
