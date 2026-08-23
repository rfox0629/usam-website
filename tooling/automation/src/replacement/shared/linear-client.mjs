import { AutomationError, ERROR_CODES } from "./errors.mjs";

const ISSUE_FIELDS = `
  id
  identifier
  title
  description
  url
  archivedAt
  branchName
  createdAt
  updatedAt
  state { name type }
  labels { nodes { name parent { name } } }
`;

function issueNodeToLauncherIssue(node) {
  return {
    id: node.identifier,
    identifier: node.identifier,
    linearId: node.id,
    title: node.title,
    description: node.description ?? "",
    url: node.url ?? null,
    archivedAt: node.archivedAt ?? null,
    gitBranchName: node.branchName ?? null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    state: node.state,
    labels: (node.labels?.nodes ?? []).map((label) => ({
      name: label.name,
      parent: label.parent ? { name: label.parent.name } : null,
    })),
  };
}

export class LinearReadClient {
  constructor({
    apiKey = process.env.LINEAR_API_KEY,
    apiUrl,
    teamKey,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.teamKey = teamKey;
    this.fetchImpl = fetchImpl;
  }

  async graphql(query, variables = {}) {
    if (!this.apiKey) {
      throw new AutomationError(ERROR_CODES.LINEAR_AUTH_MISSING, "LINEAR_API_KEY is required for live Linear reads");
    }
    if (!this.apiUrl) {
      throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, "linear.apiUrl is required for live Linear reads");
    }
    if (!this.fetchImpl) {
      throw new AutomationError(ERROR_CODES.CONFIG_INVALID_FIELD, "fetch is unavailable for live Linear reads");
    }

    const response = await this.fetchImpl(this.apiUrl, {
      body: JSON.stringify({ query, variables }),
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errors?.length) {
      throw new AutomationError(
        ERROR_CODES.LINEAR_QUERY_FAILED,
        payload.errors?.map((item) => item.message).join("; ") || `Linear HTTP ${response.status}`,
      );
    }
    return payload.data;
  }

  async listTeamIssues({ first = 250 } = {}) {
    const data = await this.graphql(
      `
query ReplacementLauncherIssues($teamKey: String!, $first: Int!) {
  issues(first: $first, filter: { team: { key: { eq: $teamKey } } }) {
    nodes {
${ISSUE_FIELDS}
    }
  }
}`,
      { first, teamKey: this.teamKey },
    );
    return (data.issues?.nodes ?? []).map(issueNodeToLauncherIssue);
  }

  async listIssuesWithRecentComments({ first = 250, commentFirst = 10 } = {}) {
    const data = await this.graphql(
      `
query ReplacementClaudeCandidateIssues($teamKey: String!, $first: Int!, $commentFirst: Int!) {
  issues(first: $first, filter: { team: { key: { eq: $teamKey } } }) {
    nodes {
${ISSUE_FIELDS}
      comments(first: $commentFirst) {
        nodes {
          id
          body
          bodyData
          createdAt
          url
          isArtificialAgentSessionRoot
          user { id name displayName email app isMentionable }
        }
      }
    }
  }
}`,
      { commentFirst, first, teamKey: this.teamKey },
    );
    return (data.issues?.nodes ?? []).map((node) => ({
      ...issueNodeToLauncherIssue(node),
      comments: (node.comments?.nodes ?? []).map((comment) => ({
        id: comment.id,
        body: comment.body ?? "",
        bodyData: comment.bodyData ?? "",
        createdAt: comment.createdAt,
        isArtificialAgentSessionRoot: comment.isArtificialAgentSessionRoot,
        url: comment.url,
        user: comment.user,
      })),
    }));
  }
}

export class LinearWriteClient extends LinearReadClient {
  async getIssueWithComments(identifier) {
    const data = await this.graphql(
      `
query ReplacementClaudeIssue($id: String!) {
  issue(id: $id) {
${ISSUE_FIELDS}
    team { key name }
    project { name }
    comments(first: 50) {
      nodes {
        id
        body
        bodyData
        createdAt
        url
        isArtificialAgentSessionRoot
        user { id name displayName email app isMentionable }
      }
    }
  }
}`,
      { id: identifier },
    );
    const node = data.issue;
    if (!node) {
      throw new AutomationError(ERROR_CODES.LINEAR_ISSUE_NOT_FOUND, `Linear issue not found: ${identifier}`);
    }
    return {
      ...issueNodeToLauncherIssue(node),
      comments: (node.comments?.nodes ?? []).map((comment) => ({
        id: comment.id,
        body: comment.body ?? "",
        bodyData: comment.bodyData ?? "",
        createdAt: comment.createdAt,
        isArtificialAgentSessionRoot: comment.isArtificialAgentSessionRoot,
        url: comment.url,
        user: comment.user,
      })),
      project: node.project,
      team: node.team,
    };
  }

  async getWorkflowStateId(name) {
    const data = await this.graphql(
      `
query ReplacementWorkflowState($teamKey: String!, $name: String!) {
  workflowStates(first: 20, filter: { team: { key: { eq: $teamKey } }, name: { eq: $name } }) {
    nodes { id name }
  }
}`,
      { name, teamKey: this.teamKey },
    );
    const state = data.workflowStates?.nodes?.[0];
    if (!state) {
      throw new AutomationError(ERROR_CODES.LINEAR_STATE_NOT_FOUND, `Linear workflow state not found: ${name}`);
    }
    return state.id;
  }

  async setState(issueId, stateName) {
    const stateId = await this.getWorkflowStateId(stateName);
    const data = await this.graphql(
      `
mutation ReplacementIssueUpdate($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue { id identifier state { name } }
  }
}`,
      { id: issueId, input: { stateId } },
    );
    return data.issueUpdate;
  }

  async createComment(issueId, body) {
    const data = await this.graphql(
      `
mutation ReplacementComment($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment { id url createdAt }
  }
}`,
      { input: { body, issueId } },
    );
    return data.commentCreate;
  }
}

export async function loadLinearShadowData({ config, client = null } = {}) {
  const linear = config.linear;
  const reader = client ?? new LinearReadClient({
    apiUrl: linear.apiUrl,
    teamKey: linear.teamKey,
  });
  const allIssues = await reader.listTeamIssues({ first: linear.pollFirst ?? 250 });
  const readyIssues = allIssues.filter((issue) => {
    const state = typeof issue.state === "string" ? issue.state : issue.state?.name;
    return state === linear.readyStateName;
  });
  const inFlightByRunner = {};
  let founderReviewCount = 0;
  for (const issue of allIssues) {
    const state = typeof issue.state === "string" ? issue.state : issue.state?.name;
    if (state === linear.founderReviewStateName) founderReviewCount += 1;
    if (state !== linear.inProgressStateName) continue;
    for (const label of issue.labels ?? []) {
      if ((label.parent?.name ?? label.parent) !== linear.runnerLabelGroup) continue;
      inFlightByRunner[label.name] = (inFlightByRunner[label.name] ?? 0) + 1;
    }
  }

  return {
    allIssues,
    context: { founderReviewCount, inFlightByRunner },
    readyIssues,
  };
}
