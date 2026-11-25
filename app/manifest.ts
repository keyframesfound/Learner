import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Learner",
    short_name: "Learner",
    start_url: "/learner/",
    display: "standalone",
    background_color: "#F2EFE6",
    theme_color: "#F2EFE6",
  };
}
