#!/usr/bin/env node
/**
 * Vercel deployment cleanup for team ryan-foxs-projects-9a51a4d5.
 *
 * Deletes only the deployment IDs listed in deletion-plan.json. It never touches
 * projects, domains, aliases, environment variables, databases, blob stores or
 * source code -- the only write it performs is DELETE /v13/deployments/{id}.
 *
 *   VERCEL_TOKEN=... node cleanup.mjs            # dry run, changes nothing
 *   VERCEL_TOKEN=... node cleanup.mjs --apply    # perform the deletions
 *   VERCEL_TOKEN=... node cleanup.mjs --verify   # re-check production domains only
 *
 * Create the token at https://vercel.com/account/settings/tokens with the
 * "Ryan Fox's projects" scope.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLAN = JSON.parse(readFileSync(join(HERE, 'deletion-plan.json'), 'utf8'))
const TEAM = PLAN.team.id
const TOKEN = process.env.VERCEL_TOKEN
const APPLY = process.argv.includes('--apply')
const VERIFY_ONLY = process.argv.includes('--verify')

// Every hostname that must still answer after the run.
const PRODUCTION_DOMAINS = [
  'usamissionaries.org', 'www.usamissionaries.org', 'new.usamissionaries.org',
  'usamissionaries.com', 'www.usamissionaries.com',
  'kitchentablegospel.org', 'www.kitchentablegospel.org',
  'ktgospel.com', 'www.ktgospel.com',
  'discipleshipoperatingsystem.com', 'www.discipleshipoperatingsystem.com',
  'missionofreconciliation.org', 'www.missionofreconciliation.org',
  'app.usamissionaries.org',
  'savestandard.org', 'www.savestandard.org',
  'stewardship.capital', 'thelords.army', 'alignedinsights.tech',
  'autopilotstrategies.com', 'groundwork.autopilotstrategies.com',
  'thestickkids.com', 'www.thestickkids.com',
]

if (!TOKEN) {
  console.error('VERCEL_TOKEN is not set. Create one at https://vercel.com/account/settings/tokens')
  process.exit(1)
}

async function api (path, init = {}) {
  const url = new URL(`https://api.vercel.com${path}`)
  url.searchParams.set('teamId', TEAM)
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`)
  return body
}

/** Every deployment ID an alias currently points at. These must never be deleted. */
async function liveDeploymentIds () {
  const live = new Map()
  let until
  for (;;) {
    const qs = until ? `?limit=100&until=${until}` : '?limit=100'
    const { aliases, pagination } = await api(`/v4/aliases${qs}`)
    for (const a of aliases) {
      if (!a.deploymentId) continue
      if (!live.has(a.deploymentId)) live.set(a.deploymentId, [])
      live.get(a.deploymentId).push(a.alias)
    }
    if (!pagination?.next) break
    until = pagination.next
  }
  return live
}

async function checkDomains () {
  console.log('\nProduction domain check')
  let bad = 0
  for (const d of PRODUCTION_DOMAINS) {
    try {
      const res = await fetch(`https://${d}`, { redirect: 'manual' })
      const ok = res.status < 400
      if (!ok) bad++
      const loc = res.headers.get('location')
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${d.padEnd(38)} ${res.status}${loc ? ' -> ' + loc : ''}`)
    } catch (err) {
      bad++
      console.log(`  FAIL ${d.padEnd(38)} ${err.message}`)
    }
  }
  console.log(bad === 0 ? 'All production domains responded.' : `${bad} domain(s) FAILED -- investigate before going further.`)
  return bad
}

async function main () {
  if (VERIFY_ONLY) { process.exit((await checkDomains()) === 0 ? 0 : 1) }

  console.log(`Mode: ${APPLY ? 'APPLY (deletions are permanent)' : 'DRY RUN (nothing will be deleted)'}`)

  if (await checkDomains() !== 0 && APPLY) {
    console.error('\nRefusing to delete while a production domain is already failing.')
    process.exit(1)
  }

  console.log('\nResolving live aliases...')
  const live = await liveDeploymentIds()
  console.log(`  ${live.size} deployment(s) are currently serving an alias.`)

  // Safety gate: the plan must not overlap anything an alias resolves to.
  const collisions = []
  for (const p of PLAN.projects) for (const id of p.delete) if (live.has(id)) collisions.push({ project: p.project, id, aliases: live.get(id) })
  if (collisions.length) {
    console.error('\nABORT -- the plan targets deployments that are serving live domains:')
    for (const c of collisions) console.error(`  ${c.project}: ${c.id} serves ${c.aliases.join(', ')}`)
    process.exit(1)
  }
  console.log('  Safety gate passed: no planned deletion is serving a domain.')

  const results = []
  for (const p of PLAN.projects) {
    if (!p.delete.length) { results.push({ project: p.project, deleted: 0, failed: 0 }); continue }
    let deleted = 0, failed = 0
    console.log(`\n${p.project} -- ${p.delete.length} to delete (keeping ${p.keep} of ${p.total})`)
    for (const id of p.delete) {
      if (!APPLY) { console.log(`  would delete ${id}`); deleted++; continue }
      try {
        await api(`/v13/deployments/${id}`, { method: 'DELETE' })
        console.log(`  deleted ${id}`)
        deleted++
      } catch (err) {
        console.log(`  FAILED  ${id}: ${err.message}`)
        failed++
      }
      await new Promise(r => setTimeout(r, 250)) // stay under the rate limit
    }
    results.push({ project: p.project, deleted, failed })
  }

  console.log(`\n${'Project'.padEnd(32)} ${APPLY ? 'deleted' : 'would delete'}   failed`)
  let total = 0, totalFailed = 0
  for (const r of results) {
    total += r.deleted; totalFailed += r.failed
    console.log(`${r.project.padEnd(32)} ${String(r.deleted).padStart(7)}   ${String(r.failed).padStart(6)}`)
  }
  console.log(`${'TOTAL'.padEnd(32)} ${String(total).padStart(7)}   ${String(totalFailed).padStart(6)}`)

  if (APPLY) {
    console.log('\nRe-verifying production domains after cleanup...')
    process.exit((await checkDomains()) === 0 ? 0 : 1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
