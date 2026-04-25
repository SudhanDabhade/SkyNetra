# 🚁 AI-Powered Drone Response App

A real-time emergency response platform that connects civilians with autonomous drone dispatch.

## 📁 Project Structure

### 📱 User Side (Flutter)
- **`lib/screens/incident_report_screen.dart`**: High-urgency UI for reporting emergencies.
- **`lib/logic/severity_calculator.dart`**: Logic for calculating incident priority (0-100).
- **`lib/services/database_service.dart`**: Firebase Realtime Database integration & GPS capture.

### 📡 Command Center (Python)
- **`dispatch_listener.py`**: Real-time Python script that listens to Firebase and triggers drone dispatch for "CRITICAL" incidents.

## 🚀 Setup Instructions

### Backend (Python)
1. Install dependencies: `pip install firebase-admin`
2. Place your `serviceAccountKey.json` from Firebase in the root folder.
3. Update the `databaseURL` in `dispatch_listener.py`.
4. Run: `python dispatch_listener.py`

### Mobile App (Flutter)
1. Install dependencies: `flutter pub get`
2. Configure Firebase (Android/iOS) using `flutterfire configure`.
3. Run: `flutter run`

## 🛡️ Firebase Security Rules
Ensure your Realtime Database rules allow writes for authenticated (or test) users:
```json
{
  "rules": {
    "incidents": {
      ".read": "true",
      ".write": "true"
    }
  }
}
```
*(Note: Change to `auth != null` before production)*
