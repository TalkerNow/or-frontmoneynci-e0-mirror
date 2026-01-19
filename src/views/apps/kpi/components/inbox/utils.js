import React from "react";
import { MessageSquare, Phone, Mail, FileText } from "lucide-react";

/**
 * Calculates a dynamic complexity score (0-100) based on diagnostic attributes.
 */
export function calculateComplexityScore(attrs = {}) {
    let score = 30; // Base score

    // Q1: Number of companies
    const q1 = (attrs.SIMULATEUR_DIFFICULTE_Q1 || "").toString();
    if (q1.includes("9+")) score += 25;
    else if (q1.includes("4-9") || q1.includes("4–9")) score += 15;

    // Q2: Simultaneous companies
    if ((attrs.SIMULATEUR_DIFFICULTE_Q2 || "").toLowerCase() === "oui")
        score += 10;

    // Q3: Abroad career
    if ((attrs.SIMULATEUR_DIFFICULTE_Q3 || "").toLowerCase() === "oui")
        score += 20;

    // Q4: Career gaps (maladie, chomage)
    if ((attrs.SIMULATEUR_DIFFICULTE_Q4 || "").toLowerCase() === "oui")
        score += 10;

    // Q5: Specific regimes (Fonctionnaire/Contractuel)
    const q5 = (attrs.SIMULATEUR_DIFFICULTE_Q5 || "").toLowerCase();
    if (q5.includes("oui")) score += 15;

    // Q6: Independent / Manager
    if ((attrs.SIMULATEUR_DIFFICULTE_Q6 || "").toLowerCase() === "oui")
        score += 15;

    // Q8: RIS not checked
    if ((attrs.SIMULATEUR_DIFFICULTE_Q8 || "").toLowerCase() === "non")
        score += 15;

    return Math.min(100, score);
}

// Helper: Extract task text from the 'data' JSON field
export function getTaskText(item) {
    if (!item) return "";

    if (item.text) return item.text;
    if (item.task_text) return item.task_text;

    if (item.data) {
        try {
            const parsed =
                typeof item.data === "string" ? JSON.parse(item.data) : item.data;
            return (
                parsed.text ||
                parsed.task_text ||
                (typeof item.data === "string" ? item.data : "")
            );
        } catch {
            return typeof item.data === "string" ? item.data : "";
        }
    }

    return item.content || item.message || "Tâche sans titre";
}

// Helper: Format phone number to French format (06 12 34 56 78)
export function formatPhoneNumber(input) {
    if (!input) return "";
    // Remove all non-digit characters
    let digits = String(input).replace(/\D/g, "");

    // Handle international formats (+33, 0033, 33)
    if (digits.startsWith("33") && digits.length > 9) {
        digits = "0" + digits.slice(2);
    } else if (digits.length === 9 && !digits.startsWith("0")) {
        digits = "0" + digits;
    }

    // Limit to 10 digits
    digits = digits.slice(0, 10);

    // Format as XX XX XX XX XX
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

// Helper: Format date to relative time
export function formatRelativeDate(isoDate) {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const now = new Date();

    // Check if same day
    const isToday = date.toDateString() === now.toDateString();

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
        // Today: show only time (HH:MM)
        return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } else if (isYesterday) {
        // Yesterday: show "Hier" + time
        return `Hier ${date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    }
    // Older: show date (DD/MM/YYYY)
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

// Helper: Extract summary from messages
export function extractSummaryFromMessages(messages) {
    if (!messages || messages.length === 0) return [];
    const userMessages = messages.filter((m) => m.role === "user");
    return userMessages
        .slice(0, 3)
        .map(
            (m) => m.content.substring(0, 50) + (m.content.length > 50 ? "..." : "")
        );
}

// Helper: Map conversation from backend to inbox item
export function mapConversationToInboxItem(conv) {
    const type =
        conv._source ||
        conv.type ||
        (conv.messages && conv.messages.length > 0 ? "chatbot" : "diagnostic");

    let firstName = "";
    let lastName = "";
    let email = "";
    let phone = "";
    let attributes = conv.attributes || {};

    if (type === "diagnostic") {
        // DIAGNOSTIC MAPPING
        // We look for specific attributes keys known in the simulator
        firstName = attributes.PRENOM || attributes.prenom || "";
        lastName = attributes.NOM || attributes.nom || "";
        email = attributes.EMAIL || attributes.email || "";
        phone =
            attributes.TELEPHONE ||
            attributes.telephone ||
            attributes.TELEPHONE_MOBILE ||
            "";

        // Additional attributes specific fields if needed
        if (!phone) phone = conv.phone || conv.telephone || "";
        if (!email) email = conv.email || "";

        // Fallback: try to guess name from email if name is missing
        if ((!firstName || !lastName) && email) {
            const localPart = email.split("@")[0];
            // If it has a separator like dot or hyphen, might be First.Last
            const splitName = localPart.split(/[.-]/);
            if (splitName.length > 1) {
                firstName = firstName || splitName[0];
                lastName = lastName || splitName.slice(1).join(" ");
            } else if (!firstName && !lastName) {
                firstName = localPart;
            }
        }
    } else if (type === "chatbot") {
        // CHATBOT MAPPING
        const user = conv.user || conv.visitor || conv.contact || {};

        firstName =
            user.first_name || user.firstname || user.prenom || conv.firstname || "";
        lastName =
            user.last_name || user.lastname || user.nom || conv.lastname || "";
        email = user.email || conv.email || "";
        phone = user.phone || user.telephone || conv.phone || conv.telephone || "";

        // If structured data is missing, we must extract from messages (as seen in user logs)
        if (!email || !phone) {
            const messages = conv.messages || [];
            // Scan user messages one by one
            messages.forEach((msg) => {
                if (msg.role === "user" && msg.content) {
                    const text = msg.content.trim();

                    // EMAIL EXTRACTION
                    if (!email) {
                        const emailMatch = text.match(
                            /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
                        );
                        if (emailMatch) {
                            email = emailMatch[0];
                        }
                    }

                    // PHONE EXTRACTION (0603263227 type pattern)
                    if (!phone) {
                        // Clean non-digits to check length
                        const digits = text.replace(/\D/g, "");
                        // Check if it looks like a standalone phone number (10 digits starting with 0, or international)
                        // We check if the whole message is roughly just a phone number or contains one clearly
                        const phoneMatch = text.match(
                            /(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}/
                        );
                        if (phoneMatch) {
                            phone = phoneMatch[0];
                        } else if (digits.length === 10 && digits.startsWith("0")) {
                            // Fallback for raw digits "0603263227"
                            phone = digits;
                        }
                    }
                }
            });
        }

        // If name is not split, try user.name
        if (!firstName && !lastName) {
            const full = user.name || conv.name || "";
            if (full) {
                const parts = full.trim().split(" ");
                if (parts.length > 1) {
                    lastName = parts.pop();
                    firstName = parts.join(" ");
                } else {
                    firstName = full;
                }
            } else if (email) {
                // Last resort: try to guess name from email (d-h@wanadoo.fr -> d-h)
                const localPart = email.split("@")[0];
                // If it has a separator like dot or hyphen, might be First.Last
                const splitName = localPart.split(/[.-]/);
                if (splitName.length > 1) {
                    firstName = splitName[0];
                    lastName = splitName.slice(1).join(" ");
                } else {
                    firstName = localPart;
                }
            }
        }
    } else {
        // OTHER (Call, Email, etc.)
        const user = conv.user || conv.client || {};
        firstName = user.first_name || conv.client_first_name || "";
        lastName = user.last_name || conv.client_last_name || "";
        email = user.email || conv.email || conv.client_email || "";
        phone = user.phone || conv.phone || conv.client_phone || "";
    }

    // Construct Display Name
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || phone || email || "Prospect inconnu";

    const clientId =
        conv.user_id ||
        conv.user?.id ||
        conv.contact?.id ||
        conv.attributes?.user_id ||
        null;

    return {
        id: conv.id,
        clientId: clientId,
        type: type,
        name: displayName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        date: formatRelativeDate(
            conv.created_at || conv.kpi_date || new Date().toISOString()
        ),
        score: conv.diagnostic_score || 0,
        summary:
            conv.messages && conv.messages.length > 0
                ? extractSummaryFromMessages(conv.messages)
                : conv.note
                    ? [conv.note]
                    : conv.objet
                        ? [conv.objet]
                        : [],
        status: conv.status || conv.action || "new",
        priority: conv.priority || "medium",
        hasMultipleChannels: conv._hasMultipleChannels || false,
        raw: conv,
    };
}

export const getTypeIcon = (type) => {
    switch (type) {
        case "chatbot":
            return <MessageSquare size={14} className="text-blue-500" />;
        case "call":
            return <Phone size={14} className="text-green-500" />;
        case "email":
            return <Mail size={14} className="text-indigo-500" />;
        case "diagnostic":
            return <FileText size={14} className="text-orange-500" />;
        default:
            return <MessageSquare size={14} />;
    }
};

export const getTypeLabel = (type) => {
    switch (type) {
        case "chatbot":
            return "Chatbot";
        case "call":
            return "Appel";
        case "email":
            return "Email";
        case "diagnostic":
            return "Diagnostic";
        default:
            return "Autre";
    }
};

export const getTypeColor = (type) => {
    switch (type) {
        case "chatbot":
            return "blue";
        case "call":
            return "green";
        case "email":
            return "indigo";
        case "diagnostic":
            return "orange";
        default:
            return "gray";
    }
};
