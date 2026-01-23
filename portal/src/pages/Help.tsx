import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
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
  ArrowRight,
  Sparkles,
} from "@/lib/icons";

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
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div
        className="opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f8] border border-black/5 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#6b6b76]" />
          <span className="text-xs font-medium text-[#6b6b76]">Support</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#0f0f12] tracking-tight">
          Help & <span className="italic text-[#6b6b76]">Support</span>
        </h1>
        <p className="mt-2 text-[#6b6b76]">
          Find answers to common questions or get in touch with our team
        </p>
      </div>

      {/* Search */}
      <div
        className="max-w-xl opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
        }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d9da6]" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white border border-[#EBEBEB] rounded-xl text-sm text-[#0f0f12] placeholder-[#9d9da6] focus:outline-none focus:border-[#253FF6] focus:ring-2 focus:ring-[#253FF6]/10 transition-all"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards",
        }}
      >
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
      <div className="space-y-4">
        <h2
          className="font-serif text-xl text-[#0f0f12] opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards",
          }}
        >
          Frequently Asked Questions
        </h2>

        {filteredCategories.length === 0 ? (
          <div
            className="bg-white rounded-2xl border border-black/5 p-8 text-center opacity-0"
            style={{
              animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards",
            }}
          >
            <div className="w-14 h-14 bg-[#f8f8f8] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-[#9d9da6]" />
            </div>
            <p className="font-medium text-[#0f0f12]">No results found</p>
            <p className="mt-1 text-sm text-[#6b6b76]">
              Try different keywords or browse categories below
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 h-10 px-5 text-sm font-medium text-[#0f0f12] bg-[#f8f8f8] hover:bg-[#f0f0f0] rounded-lg transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategories.map((category, catIndex) => (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-black/5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02),0_8px_16px_rgba(0,0,0,0.03)] overflow-hidden opacity-0"
                style={{
                  animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + catIndex * 0.05}s forwards`,
                }}
              >
                <div className="p-5 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f8f8f8] border border-black/5 flex items-center justify-center">
                      <category.icon className="h-4 w-4 text-[#0f0f12]" />
                    </div>
                    <h3 className="font-serif text-lg text-[#0f0f12]">{category.title}</h3>
                  </div>
                </div>
                <div className="px-5 pb-2">
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.id}-${index}`}
                        className="border-b border-black/5 last:border-0"
                      >
                        <AccordionTrigger className="py-4 text-left text-[#0f0f12] hover:no-underline hover:text-[#253FF6] [&[data-state=open]]:text-[#253FF6]">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-[#6b6b76] pb-4 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section */}
      <div
        className="bg-[#0f0f12] rounded-2xl p-6 sm:p-8 relative overflow-hidden opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
        }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-white">Still Need Help?</h3>
              <p className="text-white/60 text-sm">Our team is here to assist you</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mt-6">
            <ContactCard
              icon={Mail}
              title="Email Us"
              value="hello@amjadhazli.com"
              href="mailto:hello@amjadhazli.com"
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
        </div>
      </div>

      {/* Resources */}
      <div
        className="bg-white rounded-2xl border border-black/5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02),0_8px_16px_rgba(0,0,0,0.03)] overflow-hidden opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards",
        }}
      >
        <div className="p-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f0f12] flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#0f0f12]">Resources</h3>
              <p className="text-[#9d9da6] text-sm">Additional information and guides</p>
            </div>
          </div>
        </div>
        <div className="p-4 grid gap-2 sm:grid-cols-2">
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
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
    <Link
      to={href}
      className="group block bg-white rounded-xl border border-black/5 p-4 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#f8f8f8] border border-black/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
          <Icon className="h-4 w-4 text-[#0f0f12]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0f0f12]">{title}</p>
          <p className="text-xs text-[#6b6b76]">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-[#9d9da6] opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
    </Link>
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
      className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur p-4 transition-all hover:bg-white/15"
    >
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-sm text-white/60">{value}</p>
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
    <button className="group flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-200 hover:bg-[#f8f8f8] w-full">
      <div className="w-10 h-10 rounded-xl bg-[#f8f8f8] border border-black/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
        <FileText className="h-4 w-4 text-[#0f0f12]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0f0f12]">{title}</p>
        <p className="text-xs text-[#6b6b76]">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[#9d9da6] opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
    </button>
  );
}
