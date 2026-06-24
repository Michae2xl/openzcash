/**
 * ZCG governance links and the latest Community Grants meeting minutes,
 * sourced from the Zcash Community forum. Static for now; a later phase can
 * scrape the "Community Grants Updates" category on a schedule.
 */

export type MeetingMinute = {
  title: string;
  date: string; // ISO yyyy-mm-dd
  url: string;
};

export const ZCG_MEETINGS: MeetingMinute[] = [
  {
    title: "June 8, 2026",
    date: "2026-06-08",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-6-8-2026/56139",
  },
  {
    title: "May 25, 2026",
    date: "2026-05-25",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-05-25-2026/55883",
  },
  {
    title: "April 27, 2026",
    date: "2026-04-27",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-april-27-2026/55555",
  },
  {
    title: "April 13, 2026",
    date: "2026-04-13",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-4-13-2026/55349",
  },
  {
    title: "March 30, 2026",
    date: "2026-03-30",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-3-30-2026/55196",
  },
  {
    title: "February 3, 2026",
    date: "2026-02-03",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-2-3-2026/54548",
  },
  {
    title: "January 19, 2026",
    date: "2026-01-19",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-1-19-2026/54383",
  },
  {
    title: "January 5, 2026",
    date: "2026-01-05",
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-1-5-2026/54163",
  },
];

/** Where new proposals are submitted (GitHub trackers). */
export const PROPOSAL_LINKS = {
  zcg: "https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues",
  fpf: "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues",
};

export const ZCG_FORUM_CATEGORY =
  "https://forum.zcashcommunity.com/c/community-grants-updates";
