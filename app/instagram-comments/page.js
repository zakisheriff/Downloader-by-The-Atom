import { Suspense } from "react";
import InstagramComments from "@/components/InstagramComments";
import styles from "@/app/dashboard/page.module.css";

export const metadata = {
  title: "Instagram Comment Grabber — Copy Instagram Comments as Text",
  description: "Paste an Instagram post, reel, or comment link to copy the comments as plain text. Perfect for grabbing prompts, recipes, and tips people leave in the comments."
};

export default function InstagramCommentsPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <InstagramComments />
      </Suspense>
    </div>
  );
}
