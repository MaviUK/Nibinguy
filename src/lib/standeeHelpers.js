import { supabase } from './supabaseClient'

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/,+$/, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

export async function submitClaim({
  address,
  bins,
  dates,
  neighbourName,
  nominatedAddress,
  town,
  postcode,
  isSpotted = false   // ✅ Add this flag
}) {
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
  console.log('👀 Is spotted claim:', isSpotted)

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

  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .eq('current_slug', originalSlug)
    .maybeSingle()

  if (locationError || !locationData) {
    console.error('❌ Standee fetch failed:', locationError || 'Not found')
    return { success: false, error: 'This standee does not exist.' }
  }

  // ✅ Step 3: Only update location if NOT a spotted claim
  if (!isSpotted) {
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
  }

  try {
    console.log('📤 Sending to email function:', {
      name: neighbourName,
      address: trimmedAddress,
      email: 'noreply@nibinguy.com',
      binType: bins[0],
      nominatedAddress: `${trimmedNominated}, ${trimmedTown}, ${trimmedPostcode}`,
      dates
    })

    await fetch('/.netlify/functions/sendClaimEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: neighbourName,
        address: trimmedAddress,
        email: 'noreply@nibinguy.com',
        binType: bins[0],
        nominatedAddress: `${trimmedNominated}, ${trimmedTown}, ${trimmedPostcode}`,
        dates
      })
    })
  } catch (err) {
    console.error('❌ Email function failed:', err)
    return { success: false, error: 'Email failed to send.' }
  }

  return { success: true }
}
