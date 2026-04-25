update storage.buckets
set allowed_mime_types = ARRAY[
      'text/html',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml'
    ],
    file_size_limit = 26214400
where id = 'patient-guides';