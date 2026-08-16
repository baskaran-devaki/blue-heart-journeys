# Blue Heart Journeys

Build a complete premium mobile-first PWA called:

💙 BLUE HEART GUYS – சூறாவளி சுற்றுப்பயணம்

This is a private friendship travel app for the BLUE HEART GUYS group. It must feel like a premium Android/iOS mobile app, not a normal website.

DESIGN:
Use a premium Blue Heart theme with deep navy, electric blue, white, soft blue glow, glassmorphism cards, rounded corners, smooth animations and beautiful Tamil typography. Make it attractive, emotional, modern and friendship-focused. Fully responsive, with mobile as the primary experience.

HOME SCREEN:

HEADER:
💙 BLUE HEART GUYS – சூறாவளி சுற்றுப்பயணம்
Show live current date and time.

CARD 1 – 🌴 சுற்றுலா விவரம்:
Show the latest upcoming/active trip, trip date, destination and short details.
Add “முழுவிவரம்” button.
Use an automatic changing background slideshow with beautiful AI-style images of the actual trip destinations.
Show only Confirmed + Payment Done members as official trip members.

If the current trip is completed and no new trip is available, automatically show:

🌴 Coming Soon
💙 விரைவில் அடுத்த பயணம்
“நம் அடுத்த நினைவுக்காக காத்திருக்கிறோம்...”

Admin can create the next trip at any time.

CARD 2 – 📸 MEMORIES – நினைவுகள்:
Create separate Photos and Videos sections.
Add an Upload button on the top-right.
Approved members can upload photos and videos directly from their phones.
Use Supabase Storage.
Show an attractive gallery with member name, date and trip information.
Admin can manage/delete uploaded media.

CARD 3 – 💰 WALLET:
Show:
- Available Amount
- Total Collection
- Total Expenses
- Current Balance
- Transaction History
- Add Money button

Admin can set the budget/contribution amount per person.

When a member confirms the trip, show the required amount and “Pay via UPI”.

UPI ID:
asalbaskar@sbi

Open the UPI payment app using UPI intent/deep link where supported.

Do NOT fake payment success.
After payment, allow the member to submit UTR/reference number.
Show “Payment Verification Pending”.
Only Admin can verify the payment.
After verification show:
✅ Payment Done

Maintain real income, expenses and balance using Supabase.

CARD 4 – 👥 MEMBERS:
Show all Admin-approved members.

Each member row should show:
Member Name | Confirm | Not Interested

When Confirm is selected:
show payment amount and Pay option.

After verified payment:
show:
✅ Payment Done

If member chooses Ignore:
show:
❌ Not Interested

Only Confirmed + Payment Done members are official Trip Members and should appear in Card 1.

CARD 5 – 💬 MEMBERS CHAT:
Create a private realtime group chat for approved members.
Support:
- Text
- Emoji
- Photos
- Videos
- Reactions
- Timestamps
- Online status

Use Supabase Realtime.

CARD 6 – 🔴 LIVE TRIP:

Create a prominent Live Trip card.

When Admin or an approved member starts Live from their own device, that device becomes the Host.

Show:
🔴 Live Video
📍 Current Location
👥 Members Online
👀 Watching Count
💬 Live Chat
❤️ Reactions

Host must explicitly allow:
Camera
Microphone
Location

Only one Host can be Live at a time.

When Live stops, video, microphone and location sharing must immediately stop.

For Version 1, use a suitable external live streaming service such as YouTube Live for video streaming, while Supabase manages live session information, host permissions, location, viewer status, chat and reactions.

LIVE VIEWERS:
Members and non-participating friends should be able to watch the active trip Live according to the configured access rules.

Show an attractive Live page with:
- Live video
- Current location map
- Members online
- Watching count
- Live chat
- Reactions

When no Live is active:
⚪ LIVE OFFLINE

LOGIN:
Use Supabase Phone OTP authentication.

Only Admin-approved phone numbers can log in.

ADMIN PANEL:

Create a secure Admin Panel where Admin can:

TRIP MANAGEMENT:
- Create new trip
- Edit trip
- Trip dates
- Destination
- Starting location
- Itinerary
- Day-wise schedule
- Destination images
- Budget per person
- Trip status
- Google Maps locations

MEMBER MANAGEMENT:
- Add member
- Edit member
- Remove member
- Approve phone numbers
- View Confirmed
- View Not Interested
- View Payment Pending
- View Payment Done

WALLET MANAGEMENT:
- Add income
- Add expenses
- Edit transactions
- Verify UPI payments
- Store UTR/reference
- View total collection
- View total expenses
- View available balance

MEMORIES MANAGEMENT:
- View uploads
- Delete
- Hide
- Restore

CHAT MANAGEMENT:
- Delete messages
- Pin announcements
- Moderate chat

LIVE MANAGEMENT:
- View active Host
- Start/stop Live
- Stop current Host if necessary
- Manage Live session
- Moderate Live Chat

THIRUKKURAL MANAGEMENT:
- Add
- Edit
- Delete
- Schedule daily Thirukkural

FOOTER:

Create an attractive Tamil footer.

Show a Thiruvalluvar image/logo on the left.

Display:

📖 இன்றைய திருக்குறள்

Show the Thirukkural and its Tamil explanation.

Automatically change to a different Kural every day.
The same Kural must remain for the whole calendar day.
Admin can manage the Kural content.

ALL TRIPS – அனைத்து பயணங்கள்:

The app must support multiple trips, not just one trip.

Add an:
📚 “ALL TRIPS – அனைத்து பயணங்கள்”
button on the Home screen.

Every trip must be stored separately in Supabase.

When a trip is completed, never delete it.

The All Trips page must show every past, current and upcoming trip.

Each trip card should show:
- Trip name
- Destination
- Trip dates
- Total days
- Number of members
- Total amount collected
- Total expenses
- Final balance
- Trip status
- Cover image

Statuses:
🟢 Upcoming
🔴 Live
🔵 Completed
🟡 Coming Soon

Clicking a previous trip should open its complete Trip Details and Memories.

For every completed trip preserve:
- Full itinerary
- Trip members
- Photos
- Videos
- Total days
- Total contributions
- Total expenses
- Expense breakdown
- Final balance
- Trip memories

The Home screen must automatically show the latest active/upcoming trip.

After a trip is completed, Card 1 should automatically switch to:
🌴 Coming Soon – விரைவில் அடுத்த பயணம்
until Admin creates the next trip.

Creating a new trip must never affect previous trip data.

DATABASE:
Use Supabase for:
- Phone OTP Authentication
- PostgreSQL database
- Storage
- Realtime Chat
- Members
- Trips
- Trip itinerary
- Payments
- Wallet
- Expenses
- Memories
- Live sessions
- Live location
- Live chat
- Reactions
- Thirukkural
- Notifications

Keep all data database-driven, not hardcoded.

SECURITY:
Use Supabase Row Level Security.

Members must NOT be able to:
- Edit other members
- Change payment status
- Change wallet balance
- Add fake expenses
- Verify their own payment
- Access Admin settings
- Access unauthorized member data
- Start Live unless they are an approved Live Host

Only Admin can verify payments and manage the application.

Never expose secret API keys in frontend code.

NOTIFICATIONS:
Create notification-ready architecture for:
- Trip updates
- Payment reminders
- Trip reminders
- Live started notifications
- Important Admin announcements

PWA:
Make the application installable as a mobile PWA with:
- App icon
- Splash screen
- Manifest
- Responsive mobile UI
- Fast loading
- App-like navigation

Use a fixed mobile bottom navigation:

🏠 Home
📸 Memories
💰 Wallet
💬 Chat
👥 Members

Show ⚙️ Admin only for Admin users.

FINAL UI REQUIREMENT:

The application must NOT look like a generic dashboard or CRUD website.

It should feel like a premium private friendship application created specially for:

💙 BLUE HEART GUYS

The overall feeling should be:

Friendship • Travel • Memories • Fun • Togetherness • Trust

Use beautiful animations, attractive cards, high-quality destination visuals, smooth transitions and excellent mobile UX.

Optimize image/video loading with lazy loading and thumbnails.

Build the complete Version 1 using Supabase backend, authentication, storage, realtime features, wallet, trip history, memories, chat, live trip and secure Admin Panel.

Do not create only mock UI. Build the actual functional application and connect the features to Supabase wherever required.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b13c7818-0e37-4242-9b58-fa9c82909fbc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
