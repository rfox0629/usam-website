export type CommunicationNewsletterSection = {
  body: string;
  heading: string;
};

export type CommunicationNewsletter = {
  body_markdown: string;
  cta_label: string | null;
  cta_url: string | null;
  id: string;
  preheader: string | null;
  published_at: string | null;
  sections: CommunicationNewsletterSection[];
  slug: string;
  status: string;
  subject: string;
  summary: string | null;
  title: string;
};

export type CommunicationPreference = {
  enabled: boolean;
  topic: string;
};

export type CommunicationSubscriber = {
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  status: string;
};
