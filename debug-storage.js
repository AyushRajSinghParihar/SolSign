#!/usr/bin/env node

/**
 * Diagnostic script to check Supabase Storage bucket status
 * Run with: node debug-storage.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rjtnaamhomcxqrwrovvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdG5hYW1ob21jeHFyd3JvdnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjg5MjAsImV4cCI6MjA2ODcwNDkyMH0.LHAyiw1fWhAQYa7XvpCm8MvIJZm1pn9kNfQjAYSk1mk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStorage() {
  console.log('\n🔍 Checking Supabase Storage Configuration...\n');

  // 1. Try to list buckets
  console.log('1️⃣ Attempting to list storage buckets...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error listing buckets:', error.message);
    } else {
      console.log('✅ Successfully listed buckets:');
      buckets?.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });

      const documentsExists = buckets?.some(b => b.name === 'documents');
      if (!documentsExists) {
        console.log('\n⚠️  WARNING: "documents" bucket does NOT exist!');
      } else {
        const docBucket = buckets?.find(b => b.name === 'documents');
        console.log(`\n✅ "documents" bucket exists (${docBucket?.public ? 'PUBLIC' : 'PRIVATE'})`);
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  // 2. Try to upload a test file
  console.log('\n2️⃣ Attempting test upload (requires authentication)...');
  console.log('⚠️  Note: This will fail if you\'re not authenticated.');
  console.log('   To test properly, run this in the browser console instead.\n');

  // 3. Check if we can access the bucket
  console.log('3️⃣ Checking bucket access...');
  try {
    const { data: files, error } = await supabase.storage
      .from('documents')
      .list('', { limit: 1 });

    if (error) {
      if (error.message.includes('not found')) {
        console.error('❌ Bucket "documents" does NOT exist');
      } else {
        console.error('❌ Error accessing bucket:', error.message);
      }
    } else {
      console.log('✅ Successfully accessed "documents" bucket');
      console.log(`   Found ${files?.length || 0} files`);
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  console.log('\nIf you see "Bucket does NOT exist", you need to:');
  console.log('1. Go to https://app.supabase.com/project/rjtnaamhomcxqrwrovvw/storage/buckets');
  console.log('2. Click "New bucket"');
  console.log('3. Name it "documents" (exact name)');
  console.log('4. Set it to PRIVATE (not public)');
  console.log('5. Add RLS policies for INSERT, SELECT, UPDATE, DELETE');
  console.log('\n');
}

checkStorage();
