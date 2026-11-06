/**
 * EDIT YOUR TRIP HERE.
 * Guest names and groups were transcribed from the supplied allocation image,
 * reading the left column top to bottom, followed by the right column.
 * Room types are provisional and based on group sizes. IDs are internal only.
 * Destination, dates, gathering details and transport are confirmed by the user.
 * The day-by-day activities and hotel timings are suggestions, not confirmed.
 * Keep ISO timestamps timezone-aware. Set startsAt/endsAt to null to show TBC.
 */
export type RoomType = 'Triple' | 'Twin'
export interface Room {
  id: string
  type: RoomType
  capacity: number
  guests: string[]
}

export const trip = {
  name: 'Novigi Annual Trip 2026',
  year: '2026',
  isSample: false,
  itineraryIsSample: true,
  sampleNotice: 'Our getaway is on! Activities are a suggested plan; room types are provisional.',
  destination: 'Bentota',
  country: 'Sri Lanka',
  destinationDescription: 'Where palm trees sway, the ocean slows the day, and the best thing on the itinerary is being together. A coastal escape, made for our kind of company.',
  startsAt: '2026-11-13T13:30:00+05:30' as string | null,
  // Exclusive end-of-trip date boundary; no checkout/return time is confirmed.
  endsAt: '2026-11-16T00:00:00+05:30' as string | null,
  calendarStartsOn: '2026-11-13',
  calendarEndsOn: '2026-11-16',
  timeZone: 'Asia/Colombo',
  dateLabel: '13–15 November 2026',
  shortDateLabel: '13–15 Nov 2026',
  duration: '3 days, 2 nights',
  gatheringTime: '1:30–2:00 PM',
  gatheringDateLabel: '13 November',
  timeZoneLabel: 'Sri Lanka time',
  transportNote: 'Transport is provided',
  departureTime: 'To be confirmed',
  departureNote: 'Exact departure time will be shared by the organizers.',
  meetingPoint: 'Office premises',
  meetingPointNote: 'Friday, 13 November',
  hotel: 'Pullman Bentota Resort & Spa',
  hotelNote: 'Your home for two nights',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Pullman+Bentota+Resort+%26+Spa%2C+Sri+Lanka',
  heroImage: '/images/pullman-bentota-coast.webp',
  heroImageWidth: 900,
  heroImageHeight: 500,
  destinationImage: '/images/pullman-bentota-aerial.webp',
  destinationImageWidth: 1024,
  destinationImageHeight: 682,
  imageDescription: 'Pullman Bentota Resort & Spa between the ocean and the river, surrounded by palm trees in warm evening light',
  destinationImageDescription: 'Overhead view of Pullman Bentota Resort & Spa, its swimming pool, palm-lined grounds and beachfront',
  imageNote: 'Pullman Bentota Resort & Spa · Resort photography',
  calendarDescription: 'Novigi team getaway at Pullman Bentota Resort & Spa, 13–15 November 2026 (2 nights). Gather at the office premises on 13 November between 1:30 PM and 2:00 PM Sri Lanka time. Transport is provided. Departure, return and hotel check-in/check-out times will be confirmed by the organizers.',
  roomNote: 'Guest groupings follow the supplied list. Room types are based on group size and await hotel confirmation.',
  organizer: {
    name: 'Novigi organizing team',
    description: 'Your first stop for trip questions, dietary needs, or a room allocation update.',
    email: null as string | null,
    phone: null as string | null,
    contactNote: 'Contact details will be added once confirmed.',
  },
  itinerary: [
    {
      day: 1,
      date: 'Friday, 13 November',
      label: 'The escape begins',
      description: 'Leave the everyday behind. The coast is calling.',
      events: [
        { time: '1:30–2:00 PM', title: 'Meet, mingle & get ready', description: 'Gather at the office premises and find your travel buddies. Transport is provided; departure time will be confirmed.', icon: 'bus' },
        { time: 'Afternoon', title: 'Hello, ocean', description: 'Suggested: arrive at Pullman Bentota, take in the surroundings, and settle into your rooms. Check-in time is to be confirmed.', icon: 'palm' },
        { time: 'Sunset', title: 'Ease into island time', description: 'Suggested: stretch your legs with a beach walk and catch the last light with the team.', icon: 'sunset' },
        { time: 'Evening', title: 'Good food, great company', description: 'Suggested: come together for dinner and an easygoing first evening. Meal arrangements will be confirmed.', icon: 'utensils' },
      ],
    },
    {
      day: 2,
      date: 'Saturday, 14 November',
      label: 'Our kind of good day',
      description: 'A little adventure. A little doing absolutely nothing.',
      events: [
        { time: 'Morning', title: 'A slow start & a good breakfast', description: 'Suggested: wake up to sea air and enjoy a relaxed breakfast together.', icon: 'coffee' },
        { time: 'Late morning', title: 'Team spirit, beach edition', description: 'Suggested: friendly beach games and team activities. Joining in is encouraged; cheering counts too.', icon: 'sun' },
        { time: 'Afternoon', title: 'Your afternoon, your way', description: 'Suggested: refuel over lunch, then enjoy the pool, the beach, or a well-earned nap.', icon: 'utensils' },
        { time: 'Evening', title: 'An evening to remember', description: 'Suggested: dinner, music, and plenty of stories. Bring your best holiday energy.', icon: 'sparkles' },
      ],
    },
    {
      day: 3,
      date: 'Sunday, 15 November',
      label: 'One more ocean morning',
      description: 'Taking the scenic route back to the everyday.',
      events: [
        { time: 'Morning', title: 'Breakfast with a view', description: 'Suggested: enjoy a final breakfast together and make time for one last stroll.', icon: 'coffee' },
        { time: 'Before checkout', title: 'A moment for the memories', description: 'Suggested: gather for a team photo before packing up. Don’t forget to check your room.', icon: 'camera' },
        { time: 'Time TBC', title: 'Check out, memories packed', description: 'Return your key at reception. The organizing team will confirm checkout time with the hotel.', icon: 'key' },
        { time: 'Time TBC', title: 'Homeward, happy', description: 'Transport is provided for our getaway. Return arrangements and arrival time will be shared by the organizers.', icon: 'bus' },
      ],
    },
  ],
  essentials: [
    { icon: 'bus', title: 'The journey', text: 'Transport is provided. Gather at the office between 1:30 and 2:00 PM on 13 November. Exact departure and return times are to be confirmed.' },
    { icon: 'utensils', title: 'At the table', text: 'Meal arrangements are to be confirmed. Please share any dietary requirements or food allergies with the organizing team in advance.' },
    { icon: 'key', title: 'Settle right in', text: 'Two nights at Pullman Bentota Resort & Spa. Check-in and check-out times will be confirmed. Keep a photo ID handy.' },
  ],
  packing: ['Photo ID', 'Comfortable clothes', 'Swimwear & sandals', 'Sunscreen & a hat', 'Personal medication', 'Reusable water bottle'],
  reminders: [
    { question: 'What if my room allocation needs a change?', answer: 'Let the organizing team know before the trip. These guest groupings are based on the supplied list; room types are based on group sizes and must be confirmed with the hotel.' },
    { question: 'Which trip details are confirmed?', answer: 'We’re staying at Pullman Bentota Resort & Spa from 13 to 15 November 2026, for two nights. Transport is provided; gather at the office premises between 1:30 and 2:00 PM on 13 November. Daily activities are suggestions. Departure, return, meal arrangements and hotel check-in/check-out times are still to be confirmed.' },
    { question: 'Anything else I should keep in mind?', answer: 'Please gather at the office between 1:30 and 2:00 PM on 13 November. Keep valuables with you, follow hotel and beach safety guidance, and tell the organizing team about dietary or accessibility needs in advance.' },
  ],
}

export const rooms: Room[] = [
  { id: 'group-lahiru', type: 'Triple', capacity: 3, guests: ['Lahiru', 'Nisala', 'Mihiranga'] },
  { id: 'group-indika', type: 'Triple', capacity: 3, guests: ['Indika', 'Prabhath', 'Yashira'] },
  { id: 'group-akshayan', type: 'Triple', capacity: 3, guests: ['Akshayan', 'Faheem', 'Tishan'] },
  { id: 'group-yavindu', type: 'Triple', capacity: 3, guests: ['Yavindu', 'Thilanka', 'Pradeep'] },
  { id: 'group-wageesha', type: 'Triple', capacity: 3, guests: ['Wageesha', 'Barathy', 'Anton'] },
  { id: 'group-ravindu', type: 'Triple', capacity: 3, guests: ['Ravindu', 'Ashen', 'Samoda'] },
  { id: 'group-anuk', type: 'Triple', capacity: 3, guests: ['Anuk', 'Lahiru B', 'Dasun'] },
  { id: 'group-kalpana', type: 'Triple', capacity: 3, guests: ['Kalpana', 'Nirodha', 'Thenuka'] },
  { id: 'group-isuru', type: 'Triple', capacity: 3, guests: ['Isuru', 'Vihanga', 'Dilan'] },
  { id: 'group-manoj', type: 'Triple', capacity: 3, guests: ['Manoj', 'Udara', 'Sandun'] },
  { id: 'group-sathira', type: 'Twin', capacity: 2, guests: ['Sathira', 'Malaka'] },
  { id: 'group-achini', type: 'Triple', capacity: 3, guests: ['Achini', 'Ashana', 'Ransarani'] },
  { id: 'group-praveena', type: 'Triple', capacity: 3, guests: ['Praveena', 'Saumika', 'Amashi'] },
  { id: 'group-roshelle', type: 'Triple', capacity: 3, guests: ['Roshelle', 'Naduni', 'Sandunika'] },
  { id: 'group-sabeena', type: 'Triple', capacity: 3, guests: ['Sabeena', 'Shamallka', 'Nishel'] },
  { id: 'group-gg', type: 'Triple', capacity: 3, guests: ['GG', 'Sewmini', 'Nethmi'] },
  { id: 'group-tt', type: 'Triple', capacity: 3, guests: ['TT', 'Sasanka', 'Gimhani'] },
  { id: 'group-ashika', type: 'Triple', capacity: 3, guests: ['Ashika', 'Poorni', 'Geethmi'] },
  { id: 'group-chulalee', type: 'Twin', capacity: 2, guests: ['Chulalee', 'Samadhi'] },
]
