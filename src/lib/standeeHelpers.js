import { supabase } from './supabaseClient'

// Slugify a string (e.g. for address URLs)
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')     // Remove punctuation
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
}

// Submit a claim
export async function submitClaim({
  address,
  bins,
  dates,
  neighbourName,
  nominatedAddress,
  town,
  postcode
}) {
  const fullAddress = `${nominatedAddress}, ${town}`
  const fullSlug = slugify(fullAddress)

  // Step 1: Save to 'claims' table
  const { error: claimError } = await supabase.from('claims').insert([
    {
      address,
      slug: slugify(address),
      claimed_at: new Date().toISOString(),
      bins,
      selected_date_1: dates[0],
      selected_date_2: dates[1],
      neighbour_name: neighbourName,
      nominated_address: nominatedAddress,
      town,
      postcode
    }
  ])

  if (claimError) {
    console.error('❌ Claim submission error:', claimError)
    return { success: false, error: claimError.message }
  }

  // Step 2: Fetch current standee
  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .eq('current_slug', slugify(address))
    .maybeSingle()

  if (locationError) {
    console.error('❌ Error fetching standee location:', locationError)
    return { success: false, error: locationError.message }
  }

  if (!locationData) {
    console.warn('⚠️ No matching standee found for slug:', slugify(address))
    return { success: false, error: 'This standee does not exist.' }
  }

  // Step 3: Update standee_location with new destination
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
      current_address: fullAddress,
      current_slug: fullSlug,
      claimed: false,
      updated_at: new Date().toISOString(),
      history: updatedHistory
    })
    .eq('id', locationData.id)

  if (updateError) {
    console.error('❌ Error updating standee location:', updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true }
}
