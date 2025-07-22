import { supabase } from './supabaseClient'

// Slugify a string to use for URL-safe slugs
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/,+$/, '')         // Remove trailing commas
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^\w-]/g, '')     // Remove non-word characters except hyphen
}

// Submit a claim: insert to `claims`, update `standee_location`, and trigger email
export async function submitClaim({
  address,
  bins,
  dates,
  neighbourName,
  nominatedAddress,
  town,
  postcode
}) {
  // Normalize inputs
  const trimmedAddress = address.trim()
  const trimmedNominated = nominatedAddress.trim()
  const trimmedTown = town.trim()
  const trimmedPostcode = postcode.trim()

  const originalSlug = slugify(trimmedAddress)
  const newFullAddress = `${trimmedNominated}, ${trimmedTown}`
  const newSlug = slugify(newFullAddress)

  console.log('🔍 Original slug:', originalSlug)
  console.log('🏡 New address:', newFullAddress)
  console.log('🆕 New slug:', newSlug)

  // Step 1: Insert to claims table
  const { error: claimError } = await supabase.from('claims').insert([{
    address: trimmedAddress,
    slug: originalSlug,
    claimed_at: new Date().toISOString(),
    bins,
    nominated_address: trimmedNominated,
    nominated_slug: newSlug
  }])

  if (claimError) {
    console.error('❌ Claim submission error:', claimError)
    return { success: false, error: claimError.message }
  }

  // Step 2: Fetch the current standee by slug
  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .eq('current_slug', originalSlug)
    .maybeSingle()

  if (locationError || !locationData) {
    console.error('❌ Standee fetch failed:', locationError || 'Not found')
    return { success: false, error: 'This standee does not exist.' }
  }

  // Step 3: Update standee_location with new address/slug and history
  const updatedHistory = [
    ...(locationData.history || []),
    {
      address: locationData.current_address,
      slug: locationData.current_slug,
      timestamp: new Date().toISOString()
    }
  ]

  const { error: updateError } = await supabase
    .from('standee_location')
    .update({
      current_address: newFullAddress,
      current_slug: newSlug,
      claimed: false,
      updated_at: new Date().toISOString(),
      history: updatedHistory
    })
    .eq('id', locationData.id)

  if (updateError) {
    console.error('❌ Standee update error:', updateError)
    return { success: false, error: updateError.message }
  }

  // Step 4: Send email with the correct payload
  try {
    await fetch('/.netlify/functions/sendClaimEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: neighbourName,
        address: trimmedAddress,
        email: 'noreply@nibinguy.com',
        binType: bins[0],
        nominatedAddress: `${trimmedNominated}, ${trimmedTown}, ${trimmedPostcode}`
      })
    })
  } catch (err) {
    console.error('❌ Email function failed:', err)
    return { success: false, error: 'Email failed to send.' }
  }

  return { success: true }
}
