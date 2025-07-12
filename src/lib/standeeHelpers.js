import { supabase } from './supabaseClient'

// Slugify a string to use for URL-safe slugs
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
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
  const originalSlug = slugify(address)
  const newFullAddress = `${nominatedAddress.trim()}, ${town.trim()}`
  const newSlug = slugify(newFullAddress)

  // Step 1: Insert to claims table (only necessary fields)
  const { error: claimError } = await supabase.from('claims').insert([
    {
      address,
      slug: originalSlug,
      claimed_at: new Date().toISOString(),
      bins,
      nominated_address: nominatedAddress,
      nominated_slug: newSlug
    }
  ])

  if (claimError) {
    console.error('❌ Claim submission error:', claimError)
    return { success: false, error: claimError.message }
  }

  // Step 2: Fetch the current standee
  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .eq('current_slug', originalSlug)
    .maybeSingle()

  if (locationError || !locationData) {
    console.error('❌ Error fetching standee location:', locationError || 'Not found')
    return { success: false, error: 'This standee does not exist.' }
  }

  // Step 3: Update standee_location to new address and slug
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
    console.error('❌ Error updating standee location:', updateError)
    return { success: false, error: updateError.message }
  }

  // Step 4: Send email (includes full form data)
  try {
    await fetch('/.netlify/functions/sendClaimEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        neighbourName,
        address,
        bins,
        dates,
        nominatedAddress,
        town,
        postcode
      })
    })
  } catch (err) {
    console.error('❌ Email function failed:', err)
    return { success: false, error: 'Email failed to send.' }
  }

  return { success: true }
}
