# Rider Verification System

## Overview
The rider verification system allows admins to review and approve users who want to become verified riders on the platform. This ensures that only legitimate drivers with proper documentation can offer rides.

## Admin Portal Features

### 1. Verifications List Page (`/verifications`)
- View all verification requests filtered by status:
  - **Pending**: New requests awaiting review
  - **Approved**: Verified riders
  - **Rejected**: Denied requests
- Quick overview of each user including:
  - Name, email, phone number
  - Trust score and ride statistics
  - Request submission date
- Click on any user to view detailed verification information

### 2. Verification Detail Page (`/verifications/[uid]`)
- Complete user profile information
- User statistics (trust score, completed rides, ratings, cancellations)
- Document viewing area (to be implemented)
- Approve/Reject actions with optional notes
- Audit trail of verification decisions

### 3. Sidebar Navigation
- New "Verifications" menu item with badge icon
- Easy access from any admin page

## Mobile App Requirements

To complete the verification system, the following features need to be implemented in the mobile app:

### 1. Verification Request Flow

#### User Interface
Create a "Become a Verified Rider" screen where users can:
1. Upload required documents
2. Fill in verification details
3. Submit for admin review
4. Track verification status

#### Required Documents
Users should upload:
- **Driver's License** (front and back)
  - Store as: `driverLicenseFront`, `driverLicenseBack`
- **Vehicle Registration**
  - Store as: `vehicleRegistration`
- **Insurance Certificate**
  - Store as: `insuranceCertificate`
- **Profile Photo** (if not already provided)

#### Additional Information
Collect:
- Driver's license number
- License expiration date
- Vehicle make, model, year
- Vehicle license plate number
- Insurance policy number
- Insurance expiration date

### 2. Firestore Schema Updates

Update the `users` collection to include:

```typescript
interface UserVerificationData {
  // Existing fields
  riderVerificationStatus: 'pending' | 'approved' | 'rejected' | null;
  isRiderVerified: boolean;
  verificationNote?: string; // Admin's note
  
  // New fields to add
  verificationImages: {
    bikePhoto?: string; // Cloudinary URL
    licensePhoto?: string; // Cloudinary URL
    registrationPhoto?: string; // Cloudinary URL
    insurancePhoto?: string; // Cloudinary URL
  };
  
  verificationDetails: {
    licenseNumber?: string;
    licenseExpiry?: Date;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePlate?: string;
    insurancePolicyNumber?: string;
    insuranceExpiry?: Date;
  };
  
  verificationSubmittedAt?: Date; // When user submitted request
  verificationReviewedAt?: Date; // When admin reviewed
  verificationReviewedBy?: string; // Admin UID
}
```

### 3. Cloudinary Configuration

The app already uses Cloudinary for image storage with the following configuration:

**Cloud Name**: `dtxxtucfk`
**Upload Preset**: `uniride_bike_verification` (for verification images)

Images are uploaded to Cloudinary and the URLs are stored in Firestore.

### 4. Mobile App Implementation Steps

#### Step 1: Create Verification Request Screen
```dart
// Example Flutter structure
class VerificationRequestScreen extends StatefulWidget {
  // Form fields for all required information
  // Image pickers for documents
  // Submit button
}
```

#### Step 2: Document Upload Function (Cloudinary)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<String> uploadToCloudinary(File file, String documentType) async {
  final url = Uri.parse(
    'https://api.cloudinary.com/v1_1/${CloudinaryConfig.cloudName}/image/upload'
  );
  
  final request = http.MultipartRequest('POST', url)
    ..fields['upload_preset'] = CloudinaryConfig.uploadPresetBikeVerification
    ..fields['folder'] = 'verification-documents'
    ..fields['public_id'] = '${FirebaseAuth.instance.currentUser!.uid}_$documentType'
    ..files.add(await http.MultipartFile.fromPath('file', file.path));
  
  final response = await request.send();
  final responseData = await response.stream.toBytes();
  final responseString = String.fromCharCodes(responseData);
  final jsonMap = json.decode(responseString);
  
  return jsonMap['secure_url']; // Returns Cloudinary URL
}
```

#### Step 3: Submit Verification Request
```dart
Future<void> submitVerificationRequest({
  required Map<String, String> imageUrls,
  required Map<String, dynamic> details,
}) async {
  final userId = FirebaseAuth.instance.currentUser!.uid;
  
  await FirebaseFirestore.instance
      .collection('users')
      .doc(userId)
      .update({
    'riderVerificationStatus': 'pending',
    'verificationImages': imageUrls, // Cloudinary URLs
    'verificationDetails': details,
    'verificationSubmittedAt': FieldValue.serverTimestamp(),
  });
}
```

#### Step 4: Verification Status Screen
Create a screen where users can:
- View their verification status
- See admin notes if rejected
- Resubmit if rejected
- Track approval progress

### 5. Admin Portal Updates (Already Implemented)

The admin portal already has:
- ✅ List view of all verification requests
- ✅ Filtering by status (pending/approved/rejected)
- ✅ User profile and statistics display
- ✅ Approve/Reject functionality with notes
- ✅ Audit logging of verification decisions

**Pending**: Document viewing needs to be updated once mobile app uploads documents to Firebase Storage.

### 6. Admin Portal Document Viewer (Already Implemented)

The admin portal now displays Cloudinary images automatically:
- ✅ Vehicle/Bike photo
- ✅ Driver's license photo
- ✅ Vehicle registration photo
- ✅ Insurance certificate photo
- ✅ Click to open full-size image in new tab
- ✅ Vehicle details (license number, make, model, year, plate)

## Notifications

### User Notifications
Send notifications when:
- Verification is approved
- Verification is rejected (include reason)
- Documents need to be resubmitted

### Admin Notifications
- New verification request submitted
- User resubmits after rejection

## Security Considerations

1. **Document Access**: Only admins and the document owner should access verification documents
2. **Storage Rules**: Set Firebase Storage rules to restrict access
3. **Data Privacy**: Handle sensitive information (license numbers, etc.) securely
4. **Audit Trail**: All verification decisions are logged in the audit log

## Testing Checklist

### Mobile App
- [ ] User can upload all required documents
- [ ] Form validation works correctly
- [ ] Documents are uploaded to Firebase Storage
- [ ] Firestore is updated with correct data
- [ ] User can view verification status
- [ ] User receives notifications

### Admin Portal
- [x] Can view list of pending verifications
- [x] Can filter by status
- [x] Can view user details
- [x] Can view uploaded documents (Cloudinary images)
- [x] Can click images to view full-size
- [x] Can view vehicle details
- [x] Can approve verification
- [x] Can reject with reason
- [x] Audit log records decisions

## Example: Complete Verification Flow

### Mobile App Submission
```dart
// 1. Upload images to Cloudinary
final bikePhotoUrl = await uploadToCloudinary(bikePhotoFile, 'bike');
final licensePhotoUrl = await uploadToCloudinary(licenseFile, 'license');

// 2. Submit to Firestore
await FirebaseFirestore.instance
    .collection('users')
    .doc(currentUserId)
    .update({
  'riderVerificationStatus': 'pending',
  'verificationImages': {
    'bikePhoto': bikePhotoUrl,
    'licensePhoto': licensePhotoUrl,
  },
  'verificationDetails': {
    'licenseNumber': 'DL123456',
    'vehicleMake': 'Honda',
    'vehicleModel': 'Activa',
    'vehicleYear': 2022,
    'vehiclePlate': 'KA01AB1234',
  },
  'verificationSubmittedAt': FieldValue.serverTimestamp(),
});
```

### Admin Portal Review
1. Admin sees the request in `/verifications` (Pending tab)
2. Clicks on the user to view details at `/verifications/[uid]`
3. Reviews uploaded images (Cloudinary URLs displayed)
4. Checks vehicle details and user statistics
5. Approves or rejects with optional notes
6. User receives notification of decision

## Future Enhancements

1. **Automated Verification**: Use OCR to extract information from documents
2. **Expiry Reminders**: Notify users when documents are about to expire
3. **Batch Processing**: Allow admins to approve/reject multiple requests
4. **Document Comparison**: Compare uploaded documents with database records
5. **Video Verification**: Optional video call verification for high-risk cases
6. **Image Quality Check**: Validate image quality before submission
7. **Document Expiry Tracking**: Track and alert when licenses/insurance expire
