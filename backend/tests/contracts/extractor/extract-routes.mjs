/**
 * AST-based Core API call-site extractor using ts-morph.
 *
 * Finds all places in TypeScript files where the backend Core API is called:
 *   BFF patterns: coreProxy, coreFetchStream, forwardToCore, raw fetch(${CORE_API_URL}...)
 *   Mobile patterns: apiRequest(path, ...)
 *
 * Converts template-literal paths (${id}, ${safe}, etc.) to OpenAPI form ({id}, {safe}).
 *
 * Usage:
 *   node extract-routes.mjs --dir <target-dir> --mode bff|mobile
 *
 * Outputs JSON array of:
 *   { file, line, callPattern, corePath }
 * where corePath is null when the path cannot be statically resolved.
 */

import { Project, SyntaxKind } from "ts-morph";
import { resolve, relative } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    mode: { type: "string", default: "bff" },
  },
});

if (!args.dir) {
  process.stderr.write("Error: --dir is required\n");
  process.exit(1);
}

const TARGET_DIR = resolve(args.dir);
const MODE = args.mode; // "bff" | "mobile"

// BFF call patterns: function name → which argument (0-based) holds the Core path.
const BFF_PATH_PATTERNS = {
  coreProxy: 1,        // coreProxy(req, "/v1/...", opts?)
  coreFetchStream: 1,  // coreFetchStream(req, "/v1/...", opts?)
  forwardToCore: 1,    // forwardToCore(req, "/v1/...", opts?)
};

// Mobile call pattern: apiRequest(path, opts?)
const MOBILE_PATH_PATTERNS = {
  apiRequest: 0,
};

/**
 * Resolve a TemplateExpression node to an OpenAPI path string.
 * Handles: `${CORE_API_URL}/v1/...${id}...` and `/v1/...${id}...`
 */
function resolveTemplateExpression(node) {
  // ts-morph typed: TemplateExpression
  const head = node.getHead ? node.getHead() : null;
  let result = head ? head.getLiteralText() : "";

  const spans = node.getTemplateSpans ? node.getTemplateSpans() : [];
  for (const span of spans) {
    const expr = span.getExpression();
    const exprText = expr.getText().trim();
    const exprKind = expr.getKind();

    if (exprText === "CORE_API_URL") {
      // Strip the CORE_API_URL prefix entirely — it's the base URL, not part of the path.
      result = "";
    } else if (exprKind === SyntaxKind.CallExpression) {
      // Identify the callee function name.
      const fnExpr = expr.getExpression ? expr.getExpression() : null;
      const fnName = fnExpr && fnExpr.getKind() === SyntaxKind.Identifier
        ? fnExpr.getText().trim()
        : null;

      if (fnName === "buildQuery") {
        // Query-string builder — path ends here; append literal tail and stop.
        result += span.getLiteral().getLiteralText();
        break;
      } else if (fnName === "encodeURIComponent" || fnName === "encodeURI") {
        // Encoding wrapper — extract the inner argument as the dynamic segment name.
        const callArgs = expr.getArguments ? expr.getArguments() : [];
        const argIds = callArgs.length > 0 && callArgs[0].getDescendantsOfKind
          ? callArgs[0].getDescendantsOfKind(SyntaxKind.Identifier)
          : [];
        const name = argIds.length > 0 ? argIds[0].getText() : "param";
        const normalised = name
          .replace(/^safe$/, "id")
          .replace(/^safeId$/, "id")
          .replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)
          .replace(/^_/, "");
        result += `{${normalised}}`;
      } else {
        // Custom path helper: prescriptionAssetsPath(id) → "/v1/appointments/{id}/..."
        // Mark as a function-resolved segment — resolved later by resolveFunctionCallToPath.
        const allIds = expr.getDescendantsOfKind
          ? expr.getDescendantsOfKind(SyntaxKind.Identifier)
          : [];
        const firstId = allIds.length > 0 ? allIds[0].getText() : "helper";
        result += `__FNCALL__${firstId}`;
      }
    } else {
      // Convert dynamic segment to OpenAPI {param} form.
      const ids = expr.getDescendantsOfKind
        ? expr.getDescendantsOfKind(SyntaxKind.Identifier)
        : [];
      const name = ids.length > 0 ? ids[0].getText() : "param";
      const normalised = name
        .replace(/^safe$/, "id")
        .replace(/^safeId$/, "id")
        .replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)
        .replace(/^_/, "");
      result += `{${normalised}}`;
    }

    const literal = span.getLiteral();
    result += literal.getLiteralText();
  }
  return result || null;
}

/**
 * Extract Core API path from a call-expression argument node.
 * Handles: string literals, template literals, CORE_API_URL prefix template literals,
 * and simple const identifier references (e.g. const CORE_PATH = "/v1/...").
 */
function extractCorePath(argNode, callee, sourceFile) {
  const kind = argNode.getKind();

  // Plain string literal: "/v1/..."
  if (kind === SyntaxKind.StringLiteral) {
    let text = argNode.getLiteralText();
    const qIdx = text.indexOf("?");
    if (qIdx !== -1) text = text.slice(0, qIdx);
    if (text.startsWith("/v1")) return text;
    return null;
  }

  // No-substitution template literal: `/v1/fixed-path`
  if (kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
    let text = argNode.getLiteralText();
    const qIdx = text.indexOf("?");
    if (qIdx !== -1) text = text.slice(0, qIdx);
    if (text.startsWith("/v1")) return text;
    return null;
  }

  // Template expression: `/v1/...${id}...` or `${CORE_API_URL}/v1/...`
  if (kind === SyntaxKind.TemplateExpression) {
    let path = resolveTemplateExpression(argNode);
    if (!path) return null;

    // Strip query string — OpenAPI paths never include `?...`.
    const qIdx = path.indexOf("?");
    if (qIdx !== -1) path = path.slice(0, qIdx);
    if (!path) return null;

    // Resolve __FNCALL__ placeholders (e.g. `${prescriptionAssetsPath(id)}/extra`)
    if (path.startsWith("__FNCALL__") && sourceFile) {
      const match = path.match(/^__FNCALL__(\w+)(.*)$/);
      if (match) {
        const [, fnName, rest] = match;
        // Find the CallExpression for this function in the template spans.
        const spans = argNode.getTemplateSpans ? argNode.getTemplateSpans() : [];
        for (const span of spans) {
          const spanExpr = span.getExpression();
          if (spanExpr.getKind() === SyntaxKind.CallExpression) {
            const resolved = resolveFunctionCallToPath(spanExpr, sourceFile);
            if (resolved) {
              path = resolved + rest;
              break;
            }
          }
        }
      }
    }

    if (path && path.startsWith("/v1")) return path;
    return null;
  }

  // Identifier: might be a const holding the path (e.g. `const CORE_PATH = "/v1/..."`)
  if (kind === SyntaxKind.Identifier) {
    // Skip function parameter references — they are wrapper-function internals, not call sites.
    if (sourceFile && isFunctionParameterRef(argNode, sourceFile)) return "PARAM_REF";
    // Try to resolve the const declaration.
    if (sourceFile) {
      const resolved = resolveIdentifierToString(argNode, sourceFile);
      if (resolved && resolved.startsWith("/v1")) return resolved;
    }
    return null;
  }

  // CallExpression: might be a helper function like prescriptionAssetsPath(id) → "/v1/..."
  if (kind === SyntaxKind.CallExpression) {
    if (sourceFile) {
      const resolved = resolveFunctionCallToPath(argNode, sourceFile);
      if (resolved) return resolved;
    }
    return null;
  }

  return null;
}

/**
 * Try to resolve an Identifier to its string value by looking for a
 * const/let/var declaration in the same source file.
 * e.g. `const CORE_PATH = "/v1/users/me/emergency-profile"` → returns that string.
 */
function resolveIdentifierToString(identifierNode, sourceFile) {
  const name = identifierNode.getText().trim();
  const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const decl of varDecls) {
    const nameNode = decl.getNameNode();
    if (nameNode && nameNode.getText().trim() === name) {
      const init = decl.getInitializer();
      if (!init) continue;
      const initKind = init.getKind();
      if (initKind === SyntaxKind.StringLiteral) {
        return init.getLiteralText();
      }
      if (initKind === SyntaxKind.TemplateExpression) {
        return resolveTemplateExpression(init);
      }
      if (initKind === SyntaxKind.NoSubstitutionTemplateLiteral) {
        return init.getLiteralText();
      }
    }
  }
  return null;
}

/**
 * Check if a node is a function parameter reference (can't be statically resolved).
 */
function isFunctionParameterRef(node, sourceFile) {
  const name = node.getText().trim();
  const params = sourceFile.getDescendantsOfKind(SyntaxKind.Parameter);
  for (const param of params) {
    if (param.getName && param.getName() === name) return true;
  }
  return false;
}

/**
 * Try to resolve a no-arg (or single-arg) function call to a static path by
 * finding the function declaration in the same source file and examining its
 * return statement.  Handles simple one-return functions like:
 *   function prescriptionAssetsPath(id) { return `/v1/appointments/${encodeURIComponent(id)}/...`; }
 */
function resolveFunctionCallToPath(callNode, sourceFile) {
  const expr = callNode.getExpression();
  if (expr.getKind() !== SyntaxKind.Identifier) return null;
  const fnName = expr.getText().trim();

  // Find function declaration or arrow function variable with this name.
  const fnDecls = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
  for (const fn of fnDecls) {
    if (fn.getName && fn.getName() === fnName) {
      const body = fn.getBody();
      if (!body) continue;
      const returns = fn.getDescendantsOfKind(SyntaxKind.ReturnStatement);
      if (returns.length !== 1) continue; // complex — skip
      const retExpr = returns[0].getExpression();
      if (!retExpr) continue;
      const kind = retExpr.getKind();
      if (kind === SyntaxKind.StringLiteral) {
        const t = retExpr.getLiteralText();
        return t.startsWith("/v1") ? t : null;
      }
      if (kind === SyntaxKind.TemplateExpression) {
        const p = resolveTemplateExpression(retExpr);
        return p && p.startsWith("/v1") ? p : null;
      }
    }
  }
  return null;
}

const project = new Project({
  addFilesFromTsConfig: false,
  skipAddingFilesFromTsConfig: true,
  compilerOptions: {
    allowJs: true,
    noEmit: true,
  },
});

project.addSourceFilesAtPaths([
  `${TARGET_DIR}/**/*.ts`,
  `${TARGET_DIR}/**/*.tsx`,
]);

const findings = [];
const PATTERNS = MODE === "mobile" ? MOBILE_PATH_PATTERNS : BFF_PATH_PATTERNS;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = relative(process.cwd(), sourceFile.getFilePath());

  const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const callExpr of callExprs) {
    const expr = callExpr.getExpression();
    let callee = "";

    if (expr.getKind() === SyntaxKind.Identifier) {
      callee = expr.getText();
    } else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      // e.g. coreProxy in imported namespace — skip, handle separately if needed.
      continue;
    }

    if (!(callee in PATTERNS)) {
      // For BFF mode, also catch raw fetch(`${CORE_API_URL}/v1/...`) calls.
      if (MODE === "bff" && callee === "fetch") {
        const args_ = callExpr.getArguments();
        if (args_.length > 0) {
          const firstArg = args_[0];
          const argText = firstArg.getText();
          if (argText.includes("CORE_API_URL")) {
            const path = extractCorePath(firstArg, "fetch", sourceFile);
            // Skip wrapper-function internals (PARAM_REF) and non-/v1/ paths (null).
            if (!path || path === "PARAM_REF") continue;
            findings.push({
              file: filePath,
              line: callExpr.getStartLineNumber(),
              callPattern: "fetch(CORE_API_URL)",
              corePath: path,
            });
          }
        }
      }
      continue;
    }

    const pathArgIndex = PATTERNS[callee];
    const callArgs = callExpr.getArguments();
    if (callArgs.length <= pathArgIndex) {
      findings.push({
        file: filePath,
        line: callExpr.getStartLineNumber(),
        callPattern: callee,
        corePath: null,
      });
      continue;
    }

    const pathArg = callArgs[pathArgIndex];
    const corePath = extractCorePath(pathArg, callee, sourceFile);
    // Skip wrapper-function internals.
    if (corePath === "PARAM_REF") continue;
    findings.push({
      file: filePath,
      line: callExpr.getStartLineNumber(),
      callPattern: callee,
      corePath: corePath,
    });
  }
}

process.stdout.write(JSON.stringify(findings, null, 2));
