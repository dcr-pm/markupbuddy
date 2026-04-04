import { redirect } from "next/navigation";

export default function BrandDetailPage() {
  // Redirect to brands list — editing is handled inline
  redirect("/brands");
}
