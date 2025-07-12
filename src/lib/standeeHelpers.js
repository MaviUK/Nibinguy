import { supabase } from './supabaseClient'

// Slugify a string to use for URL-safe slugs
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

// Submit a claim: insert to `claims`, update `standee_location`, and call email function
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
  const newFullAddress = `${nominatedAddress}, ${town}`
  const newSlug = slugify(newFullAddress)

  // Step 1: Insert to `claims` table
  const { error: claimError } = await supabase.from('claims').insert([
    {
      address,
      slug: originalSlug,
      claimed_at: new Date().toISOString(),
      bins,
      selected_dates: dates,
      nominated_address: nominatedAddress,
      nominated_slug: newSlug,
      town,
      postcode
    }
  ])

  if (claimError) {
    console.error('Claim submission error:', claimError)
    return { success: false, error: claimError.message }
  }

  // Step 2: Fetch the current standee
  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .eq('current_slug', originalSlug)
    .maybeSingle()

  if (locationError) {
    console.error('Error fetching standee location:', locationError)
    return { success: false, error: locationError.message }
  }

  if (!locationData) {
    console.warn('No matching standee found for slug:', originalSlug)
    return { success: false, error: 'This standee does not exist.' }
  }

  const updatedHistory = [
    ...(locationData.history || []),
    {
      address: locationData.current_address,
      slug: locationData.current_slug,
      timestamp: new Date().toISOString()
    }
  ]

  // Step 3: Update standee_location to new address and slug
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
    console.error('Error updating standee location:', updateError)
    return { success: false, error: updateError.message }
  }

  // Step 4: Send email via Netlify function
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
    console.error('Email function failed:', err)
    return { success: false, error: 'Email failed to send.' }
  }

  return { success: true }
}
