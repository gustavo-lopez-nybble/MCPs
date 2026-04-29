export function mapTicket(issue: any, commentsData: any) {
  const rawAttachments = issue.fields.attachment || [];
  const desc = issue.fields.description;

  return {
    id: issue.key,
    title: issue.fields.summary,
    description: extractText(desc) || "",
    descriptionMediaUrls: collectMediaContentUrls(desc, rawAttachments),
    issueType: mapIssueType(issue.fields.issuetype),
    attachments: mapAttachmentList(rawAttachments),
    images: imageUrlsFromAttachmentList(rawAttachments),
    comments: (commentsData.comments || []).map((c: any) => mapComment(c, rawAttachments)),
  };
}

function mapIssueType(issuetype: any) {
  if (!issuetype) return null;
  return {
    id: String(issuetype.id),
    name: issuetype.name,
    subtask: Boolean(issuetype.subtask),
  };
}

function mapAttachmentList(attachments: any[]) {
  return attachments.map((a: any) => ({
    id: String(a.id),
    filename: a.filename,
    mimeType: a.mimeType,
    size: a.size,
    content: a.content,
  }));
}

function imageUrlsFromAttachmentList(attachments: any[]) {
  return attachments
    .filter((a: any) => typeof a.mimeType === "string" && a.mimeType.startsWith("image/"))
    .map((a: any) => a.content);
}

function mapComment(comment: any, issueAttachments: any[]) {
  const body = comment.body;
  return {
    id: String(comment.id),
    author: comment.author
      ? {
          displayName: comment.author.displayName,
          accountId: comment.author.accountId,
        }
      : null,
    created: comment.created,
    updated: comment.updated,
    text: extractText(body),
    bodyMediaUrls: collectMediaContentUrls(body, issueAttachments),
  };
}

/**
 * Jira Cloud REST v3: description and comment bodies are Atlassian Document Format (ADF).
 */
export function extractText(adf: any): string {
  if (!adf) return "";
  if (!adf.content) return "";
  if (!Array.isArray(adf.content)) return "";

  let text = "";

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.type === "text" && typeof node.text === "string") {
      text += node.text;
    }
    if (node.type === "paragraph") {
      text += "\n";
    }
    if (node.type === "hardBreak") {
      text += "\n";
    }
    if (node.type === "media") {
      text += "\n[media]\n";
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  for (const block of adf.content) {
    walk(block);
  }

  return text
    .replace(/(\n){3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}

/**
 * Resolves `media` nodes in ADF to Jira attachment download URLs when `attrs.id` matches an issue attachment.
 */
function collectMediaContentUrls(adf: any, issueAttachments: any[]): string[] {
  const out: string[] = [];
  if (!adf || !Array.isArray(issueAttachments) || issueAttachments.length === 0) {
    return out;
  }

  const byId = new Map(
    issueAttachments.map((a: any) => [String(a.id), a.content] as [string, string])
  );

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.type === "media" && node.attrs?.id) {
      const url = byId.get(String(node.attrs.id));
      if (url && !out.includes(url)) out.push(url);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  if (Array.isArray(adf.content)) {
    for (const block of adf.content) {
      walk(block);
    }
  }
  return out;
}
