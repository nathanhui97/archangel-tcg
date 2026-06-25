// Bindar beta landing — waitlist state machine (form → survey → done).
// Vanilla JS, no framework. Reimplements the design's DCLogic component and
// wires it to Supabase RPCs (join_waitlist, submit_waitlist_survey).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

const configured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  !/^REPLACE/i.test(SUPABASE_ANON_KEY)

const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const state = {
  step: 'form',
  email: '',
  city: '',
  games: [],   // multi  (data-group="games")
  roles: [],   // multi  (data-group="roles")
  trade: '',   // single (data-group="trade")
  want: '',    // single (data-group="want")
  freq: '',    // single (data-group="freq")
  pos: null,
  code: null,
}

// Referral: someone arrived via /?i=<code>
const referredBy = new URLSearchParams(location.search).get('i')

// Note: the [data-reveal] scroll animation lives in an inline <script> in
// index.html so page content never depends on this module (or its CDN import).

// ── Elements ────────────────────────────────────────────────────────────────
const openBtn     = document.getElementById('open-form')
const modal       = document.getElementById('beta-modal')
const modalClose  = document.getElementById('modal-close')
const form        = document.getElementById('signup-form')
const emailInput  = document.getElementById('email')
const cityInput   = document.getElementById('city')
const lgsInput    = document.getElementById('lgs')
const submitBtn   = document.getElementById('submit-email')
const errorEl     = document.getElementById('form-error')
const submitSurvey = document.getElementById('submit-survey')
const skipSurvey   = document.getElementById('skip-survey')
const inviteLinkEl = document.getElementById('invite-link')
const copyBtn      = document.getElementById('copy-invite')
const shareBtn     = document.getElementById('share-invite')

// ── Helpers ───────────────────────────────────────────────────────────────--
function showStep(step) {
  state.step = step
  document.querySelectorAll('[data-step]').forEach((el) => {
    el.hidden = el.getAttribute('data-step') !== step
  })
  if (state.pos != null) {
    document.querySelectorAll('[data-pos]').forEach((el) => {
      el.textContent = state.pos
    })
  }
}

function inviteUrl() {
  if (!state.code) return ''
  return `${location.origin}${location.pathname}?i=${state.code}`
}

function updateInvite() {
  const url = inviteUrl()
  if (inviteLinkEl) inviteLinkEl.textContent = url.replace(/^https?:\/\//, '')
}

function setBusy(btn, busy, busyLabel) {
  if (!btn) return
  if (busy) {
    btn.dataset.label = btn.textContent
    btn.textContent = busyLabel || 'Working…'
    btn.disabled = true
    btn.style.opacity = '0.7'
  } else {
    btn.textContent = btn.dataset.label || btn.textContent
    btn.disabled = false
    btn.style.opacity = '1'
  }
}

function friendly(err) {
  const msg = (err && err.message) || ''
  if (/not configured/i.test(msg)) return msg
  if (/Failed to fetch|network/i.test(msg)) return 'Network hiccup — check your connection and try again.'
  return 'Something went wrong — please try again.'
}

// ── Modal: open/close the "Join the beta" popup ─────────────────────────────
function openModal(e) {
  if (e) e.preventDefault()
  modal.hidden = false
  document.body.style.overflow = 'hidden'  // lock background scroll
  requestAnimationFrame(() => { if (state.step === 'form') emailInput.focus() })
}
function closeModal() {
  modal.hidden = true
  document.body.style.overflow = ''
}
if (openBtn) openBtn.addEventListener('click', openModal)
// The top-nav + closing-CTA "Sign up for beta" links open the same popup.
document.querySelectorAll('a[href="#join"]').forEach((a) => a.addEventListener('click', openModal))
if (modalClose) modalClose.addEventListener('click', closeModal)
// Click on the dim backdrop (outside the dialog card) closes it.
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal() })
// Escape key closes it.
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal() })

// ── Email + city submit → join_waitlist ─────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  errorEl.textContent = ''
  const email = emailInput.value.trim().toLowerCase()
  const city = cityInput.value.trim()

  if (!EMAIL_RE.test(email)) {
    errorEl.textContent = "That doesn't look like a valid email."
    return
  }
  if (!city) {
    errorEl.textContent = 'Add your city so we know which areas to launch first.'
    return
  }

  state.email = email
  state.city = city
  setBusy(submitBtn, true, 'Joining…')
  try {
    if (!supabase) throw { backendMissing: true }
    const { data, error } = await supabase.rpc('join_waitlist', {
      p_email: email,
      p_city: city,
      p_referred_by: referredBy,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    state.pos = row ? row.pos : null
    state.code = row ? row.ref_code : null
    updateInvite()
    showStep('survey')
  } catch (err) {
    // If the backend isn't set up yet (e.g. migrations not run on localhost),
    // advance in PREVIEW mode so the whole flow is still demoable. Genuine
    // errors (network, etc.) surface to the user instead.
    if (isBackendMissing(err)) {
      console.warn('[Bindar] waitlist backend not ready — preview mode.', err && err.message)
      state.pos = 412
      state.code = 'preview'
      updateInvite()
      showStep('survey')
    } else {
      errorEl.textContent = friendly(err)
    }
  } finally {
    setBusy(submitBtn, false)
  }
})

// True when Supabase isn't configured or the waitlist function/table doesn't
// exist yet (PostgREST PGRST202/PGRST205, undefined_function/table, etc.).
function isBackendMissing(err) {
  if (!err) return false
  if (err.backendMissing) return true
  const code = err.code || ''
  const msg = (err.message || '') + ' ' + (err.hint || '') + ' ' + (err.details || '')
  return (
    code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01' ||
    /could not find the function|schema cache|does not exist|not configured/i.test(msg)
  )
}

// ── Survey chips ────────────────────────────────────────────────────────────
// Each chip group's data-group matches a state key. data-multi="1" groups are
// arrays (games, roles); the rest are single-select strings (trade, want, freq).
document.querySelectorAll('.chips').forEach((group) => {
  const key = group.dataset.group
  const multi = group.dataset.multi === '1'
  group.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.value
      if (multi) {
        chip.classList.toggle('selected')
        const arr = state[key]
        const i = arr.indexOf(val)
        if (i >= 0) arr.splice(i, 1)
        else arr.push(val)
      } else {
        group.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'))
        chip.classList.add('selected')
        state[key] = val
      }
    })
  })
})

async function finishSurvey(send) {
  if (send && supabase) {
    setBusy(submitSurvey, true, 'Saving…')
    try {
      await supabase.rpc('submit_waitlist_survey', {
        p_email: state.email,
        p_games: state.games,
        p_trade_how: state.trade || null,
        p_want_reason: state.want || null,
        p_lgs: (lgsInput && lgsInput.value.trim()) || null,
        p_trade_freq: state.freq || null,
        p_roles: state.roles,
      })
    } catch (_) {
      // Survey answers are a nice-to-have; never block the user on them.
    } finally {
      setBusy(submitSurvey, false)
    }
  }
  showStep('done')
}

submitSurvey.addEventListener('click', () => finishSurvey(true))
skipSurvey.addEventListener('click', () => finishSurvey(false))

// ── Done: copy + share invite ───────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  const url = inviteUrl()
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    const prev = copyBtn.textContent
    copyBtn.textContent = 'Copied!'
    setTimeout(() => { copyBtn.textContent = prev }, 1600)
  } catch (_) {
    /* clipboard blocked — no-op */
  }
})

shareBtn.addEventListener('click', async () => {
  const url = inviteUrl()
  if (!url) return
  const shareData = {
    title: 'Bindar',
    text: 'Join me on Bindar — a radar for local card trades. Sign up for the beta:',
    url,
  }
  if (navigator.share) {
    try { await navigator.share(shareData) } catch (_) { /* user cancelled */ }
  } else {
    copyBtn.click()
  }
})
