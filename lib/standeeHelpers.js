import { supabase } from './supabaseClient'

// Slugify a string (e.g. for address URLs)
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export async function submitClaim({
  address,
  bins,
  selectedDate,
  nominatedAddress
}) {
  const slug = slugify(address)
  const nominatedSlug = slugify(nominatedAddress)

  // Step 1: Submit claim to `claims` table
  const { error: claimError } = await supabase.from('claims').insert([
    {
      address,
      slug,
      claimed_at: new Date().toISOString(),
      bins,
      selected_date: selectedDate,
      nominated_address: nominatedAddress,
      nominated_slug: nominatedSlug
    }
  ])

  if (claimError) {
    console.error('Claim submission error:', claimError)
    return { success: false, error: claimError.message }
  }

  // Step 2: Update standee location to the new nominee
  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .limit(1)
    .single()

  if (locationError) {
    console.error('Could not fetch current standee location:', locationError)
    return { success: false, error: locationError.message }
  }

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
      current_address: nominatedAddress,
      current_slug: nominatedSlug,
      claimed: false,
      updated_at: new Date().toISOString(),
      history: updatedHistory
    })
    .eq('id', locationData.id)

  if (updateError) {
    console.error('Error updating standee location:', updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true }
}
