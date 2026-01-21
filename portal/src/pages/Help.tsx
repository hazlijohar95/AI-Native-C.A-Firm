import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  FileText,
  CheckSquare,
  Receipt,
  PenTool,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  BookOpen,
  Shield,
  Upload,
} from "lucide-react";

// FAQ data organized by category
const FAQ_CATEGORIES = [
  {
    id: "documents",
    title: "Documents",
    icon: FileText,
    faqs: [
      {
        question: "How do I upload documents?",
        answer:
          "Go to the Documents page and click the 'Upload Document' button. You can drag and drop files or click to browse your computer. Supported formats include PDF, images (JPG, PNG), and common office documents.",
      },
      {
        question: "What types of documents can I upload?",
        answer:
          "You can upload tax returns, financial statements, invoices, agreements, receipts, and other documents. Each document can be categorized for easy organization.",
      },
      {
        question: "How secure are my documents?",
        answer:
          "All documents are encrypted in transit and at rest. We use industry-standard security measures including SSL/TLS encryption and secure cloud storage. Only authorized users can access your documents.",
      },
      {
        question: "Can I download my uploaded documents?",
        answer:
          "Yes, you can download any document you have access to. Simply click on the document and use the download button. You can also download multiple documents at once using bulk actions.",
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: CheckSquare,
    faqs: [
      {
        question: "What are tasks?",
        answer:
          "Tasks are action items assigned to you by our accounting team. They may include document requests, information needed for your tax filing, or other items requiring your attention.",
      },
      {
        question: "How do I mark a task as complete?",
        answer:
          "On the Tasks page, find the task you want to complete and click the checkbox or 'Mark Complete' button. The task will be moved to the completed section.",
      },
      {
        question: "What do task priorities mean?",
        answer:
          "Tasks are prioritized as High, Medium, or Low. High priority tasks typically have approaching deadlines or are blocking other work. We recommend addressing high priority tasks first.",
      },
      {
        question: "Will I be notified about new tasks?",
        answer:
          "Yes, you'll receive notifications when new tasks are assigned to you. You can also see task notifications in the notification bell at the top of the page.",
      },
    ],
  },
  {
    id: "invoices",
    title: "Invoices & Payments",
    icon: Receipt,
    faqs: [
      {
        question: "How do I pay an invoice?",
        answer:
          "You can pay invoices via bank transfer. Each invoice shows our bank details and the reference number to use. Online card payments will be available soon.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "Currently, we accept bank transfers and cash payments. Online payments via credit/debit card will be available soon through our secure payment portal.",
      },
      {
        question: "How do I view my payment history?",
        answer:
          "Go to the Invoices page to see all your invoices and their payment status. Click on any invoice to view payment details and history.",
      },
      {
        question: "What happens if an invoice is overdue?",
        answer:
          "Overdue invoices are highlighted in the portal. Please contact us if you need to discuss payment arrangements. We're here to help.",
      },
    ],
  },
  {
    id: "signatures",
    title: "E-Signatures",
    icon: PenTool,
    faqs: [
      {
        question: "How do I sign a document?",
        answer:
          "Go to the Signatures page to see documents pending your signature. Click on a document to review it, then choose to draw your signature or type it. Confirm to complete the signing process.",
      },
      {
        question: "Are electronic signatures legally binding?",
        answer:
          "Yes, electronic signatures are legally binding in Malaysia under the Electronic Commerce Act 2006 and Digital Signature Act 1997. Our system captures signature metadata for verification.",
      },
      {
        question: "Can I decline to sign a document?",
        answer:
          "Yes, if you disagree with a document or need changes, you can decline to sign it. Please provide a reason so our team can assist you with any concerns.",
      },
      {
        question: "How do I know a signature request is legitimate?",
        answer:
          "All signature requests come through your authenticated portal account. You'll receive notifications when new requests are created. Contact us if you're unsure about any request.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Security",
    icon: Shield,
    faqs: [
      {
        question: "How do I update my profile information?",
        answer:
          "Currently, you can update your name and phone number through the Settings page. To change your email address, please contact us directly.",
      },
      {
        question: "How do I change my password?",
        answer:
          "If you signed up with email/password, you can reset your password from the login page using the 'Forgot Password' link. If you use Google sign-in, manage your password through your Google account.",
      },
      {
        question: "Who has access to my information?",
        answer:
          "Only you and authorized staff members at Amjad & Hazli can access your portal information. We follow strict data protection practices and never share your information with third parties without consent.",
      },
      {
        question: "How do I log out?",
        answer:
          "Click on your profile picture or name in the top right corner, then select 'Sign Out'. Always log out when using shared computers.",
      },
    ],
  },
];

export function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs based on search
  const filteredCategories = FAQ_CATEGORIES.map((category) => ({
    ...category,
    faqs: category.faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.faqs.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Help & Support
        </h1>
        <p className="mt-2 text-muted-foreground">
          Find answers to common questions or get in touch with our team
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          icon={Upload}
          title="Upload Documents"
          description="Share files securely"
          href="/documents"
        />
        <QuickLinkCard
          icon={CheckSquare}
          title="View Tasks"
          description="See pending items"
          href="/tasks"
        />
        <QuickLinkCard
          icon={Receipt}
          title="Pay Invoice"
          description="View and pay bills"
          href="/invoices"
        />
        <QuickLinkCard
          icon={PenTool}
          title="Sign Documents"
          description="E-signature requests"
          href="/signatures"
        />
      </div>

      {/* FAQ Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>

        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="flex h-48 flex-col items-center justify-center text-center">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 font-medium">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try different keywords or browse categories below
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <category.icon className="h-5 w-5 text-primary" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.id}-${index}`}
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Still Need Help?
          </CardTitle>
          <CardDescription>
            Our team is here to assist you with any questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <ContactCard
              icon={Mail}
              title="Email Us"
              value="support@amjadhazli.com"
              href="mailto:support@amjadhazli.com"
            />
            <ContactCard
              icon={Phone}
              title="Call Us"
              value="+60 3-1234 5678"
              href="tel:+60312345678"
            />
            <ContactCard
              icon={ExternalLink}
              title="Visit Office"
              value="Mon-Fri, 9am-6pm"
              href="https://maps.google.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Resources
          </CardTitle>
          <CardDescription>
            Additional information and guides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <ResourceLink
              title="Tax Filing Deadlines"
              description="Important dates for Malaysian tax submissions"
            />
            <ResourceLink
              title="Document Checklist"
              description="What documents to prepare for tax filing"
            />
            <ResourceLink
              title="Company Registration Guide"
              description="Steps for SSM registration in Malaysia"
            />
            <ResourceLink
              title="Privacy Policy"
              description="How we protect your data"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface QuickLinkCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

function QuickLinkCard({ icon: Icon, title, description, href }: QuickLinkCardProps) {
  return (
    <a href={href}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

interface ContactCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  href: string;
}

function ContactCard({ icon: Icon, title, value, href }: ContactCardProps) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
    >
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </a>
  );
}

interface ResourceLinkProps {
  title: string;
  description: string;
}

function ResourceLink({ title, description }: ResourceLinkProps) {
  return (
    <button className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 w-full">
      <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
