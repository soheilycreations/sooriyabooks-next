import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { Reveal } from "@/components/storefront/reveal";

export const metadata: Metadata = {
  title: "Awards",
  description: "Sooriya Publishers' award-winning and award-nominated books, 2000–2025.",
};

interface AwardItem {
  text: string;
  link?: { label: string; href: string };
}

interface AwardSection {
  title: string;
  items: AwardItem[];
}

// Migrated verbatim from the legacy site's "Awards" page (WordPress post
// ID 16458) — real award history, not invented. The two entries that
// linked to a book on the old site now link to that book's page here
// instead, where it exists in the current catalog.
const AWARD_SECTIONS: AwardSection[] = [
  {
    title: "Swarna Pusthaka Awards",
    items: [
      { text: '2008 Swarna Pusthaka Award Winning Novel – "Swayanjatha" (The First Swarna Pusthaka Award Winning Novel)' },
      { text: '2012 Swarna Pusthaka Award Winning Novel – "Situwara Puwatha" (Nominated)' },
      { text: '2021 Swarna Pusthaka Award Winning Novel – "Berunda Kedalla"' },
    ],
  },
  {
    title: "Swarna Pusthaka Awards — Nominated",
    items: [
      { text: '2007 Nominated For Swarna Pusthaka Awards Final Round – "Tharu Babasara"' },
      { text: '2012 Nominated For Swarna Pusthaka Awards Final Round – "Baththalangunduwa"' },
      { text: '2017 Nominated For Swarna Pusthaka Awards Final Round – "Wannadasi"' },
      { text: '2019 Nominated For Swarna Pusthaka Awards Final Round – "Dharani"' },
      {
        text: "2021 Nominated For Swarna Pusthaka Awards Final Round – ",
        link: { label: '"Bana Kusum"', href: "/book/bana-kusum-kathyana-amarasinghe" },
      },
      {
        text: "2024 Nominated For Swarna Pusthaka Awards Final Round – ",
        link: { label: '"Silver Tips"', href: "/book/silver-tips-malik-thusitha-gunarathna" },
      },
    ],
  },
  {
    title: "State Literary Awards In Sri Lanka",
    items: [
      { text: '2000 State Literary Award – Translations – "Wanagatha Lanka"' },
      { text: '2009 State Literary Award – "Vishmitha Sihina Dakinna"' },
      { text: '2009 State Literary Award – Translations – "Oblomov"' },
      { text: '2015 State Literary Award – Translations – "Yashodara"' },
      { text: '2014 State Literary Award – "Sahithya Ha Saundarya Kalawe Dharshanika Sankalpa"' },
      { text: '2016 State Literary Award – "Kalawakashaye Sirakaruwa"' },
      { text: '2018 State Literary Award – "Sinhala Nama Padhayehi Ethihasaya"' },
    ],
  },
  {
    title: "Nominated",
    items: [{ text: 'Nominated For State Literary Awards – "Mata Mathaka Gama"' }],
  },
  {
    title: "Buddhist Literary Awards",
    items: [
      { text: '2015 Buddhist Literary Award – Translations – "Yashodara"' },
      { text: '2018 Buddhist Literary Award – "Sinhala Nama Padhayehi Ethihasaya"' },
    ],
  },
  {
    title: "Rajatha Pusthaka Awards — Nominated",
    items: [
      { text: '2018 Nominated For Rajatha Pusthaka Awards Final Round – "Mal Beri Samaya"' },
      { text: '2020 Nominated For Rajatha Pusthaka Awards Final Round – "Ran Kubala"' },
    ],
  },
  {
    title: "Godage Awards",
    items: [{ text: '2009 Godage Co-award – "Dutimi Nethin Kasup Nirindh"' }],
  },
  {
    title: "Gratiaen Awards",
    items: [{ text: '2004 Winner Of Gratiaen Prize – "Kider Chetty Street"' }],
  },
];

export default function AwardsPage() {
  return (
    <div>
      <div className="container py-16 text-center md:py-24">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Award Winning Publisher</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-heading text-4xl leading-tight md:text-6xl md:leading-tight">
            Sooriya Publishers Wins Many Awards, 2000–2025
          </h1>
          <Link
            href="/category/sooriya-awarded-books"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Shop Award-Winning Books
          </Link>
        </Reveal>
      </div>

      <div className="container max-w-3xl pb-20 md:pb-28">
        <div className="space-y-12">
          {AWARD_SECTIONS.map((section, i) => (
            <Reveal key={section.title} index={i % 8}>
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" aria-hidden />
                  <h2 className="font-heading text-xl">{section.title}</h2>
                </div>
                <div className="mt-2 h-px w-10 bg-accent" aria-hidden />
                <ul className="mt-4 space-y-3">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex gap-3 border-b pb-3 text-sm text-muted-foreground last:border-b-0">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span>
                        {item.text}
                        {item.link && (
                          <Link href={item.link.href} className="text-accent hover:underline">
                            {item.link.label}
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
