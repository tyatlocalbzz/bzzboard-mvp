import { redirect } from 'next/navigation'
 
export default function ProfilePage() {
  // Redirect to the new account page
  redirect('/account')
} 