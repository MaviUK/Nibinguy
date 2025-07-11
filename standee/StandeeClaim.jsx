import { submitClaim } from '../lib/standeeHelpers'

const handleSubmit = async () => {
  const response = await submitClaim({
    address: '78 Groomsport Road, Bangor',
    bins: ['Black', 'Brown'],
    selectedDate: '2025-07-15',
    nominatedAddress: '12 Ballyholme Road, Bangor'
  })

  if (response.success) {
    alert('🎉 Success! Your free clean is booked.')
  } else {
    alert(`Something went wrong: ${response.error}`)
  }
}
