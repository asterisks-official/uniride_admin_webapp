# Cloudinary Integration for Verification System

## Overview
The UniRide app uses Cloudinary for storing verification images. This document explains how the integration works and what data structure to use.

## Cloudinary Configuration

**Cloud Name**: `dtxxtucfk`
**Upload Preset**: `uniride_bike_verification`

## Expected Firestore Data Structure

When a user submits verification from the mobile app, the following fields should be added to their user document in Firestore:

```javascript
{
  // User document in 'users' collection
  uid: "user123",
  email: "user@example.com",
  displayName: "John Doe",
  
  // Verification status
  riderVerificationStatus: "pending", // "pending" | "approved" | "rejected"
  isRiderVerified: false,
  
  // Verification images (Cloudinary URLs)
  verificationImages: {
    bikePhoto: "https://res.cloudinary.com/dtxxtucfk/image/upload/v1234567890/verification-documents/user123_bike.jpg",
    licensePhoto: "https://res.cloudinary.com/dtxxtucfk/image/upload/v1234567890/verification-documents/user123_license.jpg",
    registrationPhoto: "https://res.cloudinary.com/dtxxtucfk/image/upload/v1234567890/verification-documents/user123_registration.jpg", // optional
    insurancePhoto: "https://res.cloudinary.com/dtxxtucfk/image/upload/v1234567890/verification-documents/user123_insurance.jpg" // optional
  },
  
  // Verification details
  verificationDetails: {
    licenseNumber: "DL1234567890",
    vehicleMake: "Honda",
    vehicleModel: "Activa",
    vehicleYear: 2022,
    vehiclePlate: "KA01AB1234"
  },
  
  // Timestamps
  verificationSubmittedAt: Timestamp,
  verificationReviewedAt: Timestamp, // Set by admin
  verificationReviewedBy: "adminUid", // Set by admin
  
  // Admin notes (set during approval/rejection)
  verificationNote: "Approved - All documents verified"
}
```

## Mobile App Implementation

### 1. Upload Image to Cloudinary

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';

Future<String> uploadVerificationImage(File imageFile, String imageType) async {
  try {
    final url = Uri.parse(
      'https://api.cloudinary.com/v1_1/dtxxtucfk/image/upload'
    );
    
    final userId = FirebaseAuth.instance.currentUser!.uid;
    
    final request = http.MultipartRequest('POST', url)
      ..fields['upload_preset'] = 'uniride_bike_verification'
      ..fields['folder'] = 'verification-documents'
      ..fields['public_id'] = '${userId}_$imageType'
      ..files.add(await http.MultipartFile.fromPath('file', imageFile.path));
    
    final response = await request.send();
    
    if (response.statusCode == 200) {
      final responseData = await response.stream.toBytes();
      final responseString = String.fromCharCodes(responseData);
      final jsonMap = json.decode(responseString);
      
      return jsonMap['secure_url'];
    } else {
      throw Exception('Failed to upload image: ${response.statusCode}');
    }
  } catch (e) {
    print('Error uploading to Cloudinary: $e');
    rethrow;
  }
}
```

### 2. Submit Verification Request

```dart
Future<void> submitVerificationRequest({
  required File bikePhoto,
  required File licensePhoto,
  File? registrationPhoto,
  File? insurancePhoto,
  required String licenseNumber,
  required String vehicleMake,
  required String vehicleModel,
  required int vehicleYear,
  required String vehiclePlate,
}) async {
  try {
    // Show loading indicator
    
    // Upload images to Cloudinary
    final bikePhotoUrl = await uploadVerificationImage(bikePhoto, 'bike');
    final licensePhotoUrl = await uploadVerificationImage(licensePhoto, 'license');
    
    String? registrationPhotoUrl;
    if (registrationPhoto != null) {
      registrationPhotoUrl = await uploadVerificationImage(registrationPhoto, 'registration');
    }
    
    String? insurancePhotoUrl;
    if (insurancePhoto != null) {
      insurancePhotoUrl = await uploadVerificationImage(insurancePhoto, 'insurance');
    }
    
    // Prepare verification data
    final verificationImages = {
      'bikePhoto': bikePhotoUrl,
      'licensePhoto': licensePhotoUrl,
    };
    
    if (registrationPhotoUrl != null) {
      verificationImages['registrationPhoto'] = registrationPhotoUrl;
    }
    
    if (insurancePhotoUrl != null) {
      verificationImages['insurancePhoto'] = insurancePhotoUrl;
    }
    
    final verificationDetails = {
      'licenseNumber': licenseNumber,
      'vehicleMake': vehicleMake,
      'vehicleModel': vehicleModel,
      'vehicleYear': vehicleYear,
      'vehiclePlate': vehiclePlate,
    };
    
    // Update Firestore
    final userId = FirebaseAuth.instance.currentUser!.uid;
    await FirebaseFirestore.instance
        .collection('users')
        .doc(userId)
        .update({
      'riderVerificationStatus': 'pending',
      'verificationImages': verificationImages,
      'verificationDetails': verificationDetails,
      'verificationSubmittedAt': FieldValue.serverTimestamp(),
    });
    
    // Show success message
    print('Verification request submitted successfully!');
    
  } catch (e) {
    print('Error submitting verification: $e');
    // Show error message to user
    rethrow;
  }
}
```

### 3. Check Verification Status

```dart
Stream<String?> watchVerificationStatus() {
  final userId = FirebaseAuth.instance.currentUser!.uid;
  
  return FirebaseFirestore.instance
      .collection('users')
      .doc(userId)
      .snapshots()
      .map((snapshot) {
        if (snapshot.exists) {
          return snapshot.data()?['riderVerificationStatus'] as String?;
        }
        return null;
      });
}

// Usage in widget
StreamBuilder<String?>(
  stream: watchVerificationStatus(),
  builder: (context, snapshot) {
    if (!snapshot.hasData) return CircularProgressIndicator();
    
    final status = snapshot.data;
    
    if (status == 'pending') {
      return Text('Verification pending review');
    } else if (status == 'approved') {
      return Text('Verification approved! You can now offer rides.');
    } else if (status == 'rejected') {
      return Text('Verification rejected. Please resubmit.');
    } else {
      return ElevatedButton(
        onPressed: () => navigateToVerificationForm(),
        child: Text('Apply for Rider Verification'),
      );
    }
  },
)
```

## Admin Portal

The admin portal automatically displays:
- ✅ All verification images from Cloudinary
- ✅ Vehicle details
- ✅ User statistics
- ✅ Approve/Reject functionality
- ✅ Click images to view full-size

## Testing

### Test Data Example

To test the verification system, add this data to a user document in Firestore:

```javascript
{
  uid: "testUser123",
  email: "test@example.com",
  displayName: "Test User",
  riderVerificationStatus: "pending",
  verificationImages: {
    bikePhoto: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    licensePhoto: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  },
  verificationDetails: {
    licenseNumber: "TEST123456",
    vehicleMake: "Honda",
    vehicleModel: "Activa",
    vehicleYear: 2022,
    vehiclePlate: "TEST1234"
  },
  verificationSubmittedAt: new Date()
}
```

Then visit `/verifications` in the admin portal to see the test verification request.

## Cloudinary URL Format

Cloudinary URLs follow this format:
```
https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{folder}/{public_id}.{format}
```

Example:
```
https://res.cloudinary.com/dtxxtucfk/image/upload/v1234567890/verification-documents/user123_bike.jpg
```

## Image Transformations (Optional)

You can apply Cloudinary transformations for better display:

```dart
// Thumbnail version
String getThumbnailUrl(String originalUrl) {
  return originalUrl.replaceFirst(
    '/upload/',
    '/upload/w_300,h_300,c_fill/'
  );
}

// Optimized version
String getOptimizedUrl(String originalUrl) {
  return originalUrl.replaceFirst(
    '/upload/',
    '/upload/q_auto,f_auto/'
  );
}
```

## Security Considerations

1. **Upload Preset**: Use unsigned upload preset `uniride_bike_verification`
2. **Folder Structure**: Store all verification images in `verification-documents/` folder
3. **Public ID**: Use format `{userId}_{imageType}` for easy identification
4. **Access Control**: Images are publicly accessible via URL (consider signed URLs for sensitive data)

## Troubleshooting

### Image Upload Fails
- Check Cloudinary cloud name is correct: `dtxxtucfk`
- Verify upload preset exists: `uniride_bike_verification`
- Ensure upload preset is set to "unsigned"
- Check image file size (Cloudinary free tier has limits)

### Images Not Displaying in Admin Portal
- Verify Firestore document has `verificationImages` field
- Check that URLs are valid Cloudinary URLs
- Ensure URLs are accessible (not private)
- Check browser console for CORS errors

### Verification Status Not Updating
- Ensure Firestore security rules allow user to update their own document
- Check that `riderVerificationStatus` field is being set correctly
- Verify admin has proper permissions to update user documents
