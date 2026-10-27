import { useEffect, useMemo, useState } from 'react'

import usePageTitle from '../../hooks/usePageTitle'
import { useRuleBook } from '../../lib/ruleBook'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import './rules.css'
import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import ApplyLink from '../../components/ui/ApplyLink'

/** Tracks which category is currently being read, for the index highlight. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [ids])
  return active
}

/** While the rule book loads: two sections of headings and lines, shimmering. */
function RulesSkeleton() {
  return (
    <SkeletonGroup label="Loading the rules">
      {[0, 1].map((k) => (
        <div key={k} className="rule-cat">
          <Skeleton w="55%" h="2.6rem" style={{ marginBottom: 'var(--sp-3)' }} />
          <Skeleton w="35%" h="1rem" style={{ marginBottom: 'var(--sp-6)' }} />
          {[0, 1, 2].map((r) => (
            <div key={r} style={{ display: 'grid', gap: '0.6rem', marginBottom: 'var(--sp-6)' }}>
              <Skeleton w="40%" h="1.1rem" />
              <Skeleton w="92%" h="0.9rem" />
              <Skeleton w="78%" h="0.9rem" />
            </div>
          ))}
        </div>
      ))}
    </SkeletonGroup>
  )
}

function formatDay(value) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function RulesPage() {
  usePageTitle('Rules')
  const book = useRuleBook()
  const ruleCategories = book.categories
  const categoryIds = useMemo(() => ruleCategories.map((c) => c.id), [ruleCategories])
  const active = useActiveSection(categoryIds)
  const isDraft = !book.loading && book.status !== 'published'

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="rules-title">
        <ParallaxWord text="Rules" motion="x:6%:-10%" className="page-head__word" />
        <div className="container rules-head">
          <div>
            <h1 id="rules-title" className="page-head__title">
              Rules
            </h1>
            <p className="lede">
              The rules of the city, organised by topic. Read them before you apply — your
              application asks you to confirm you have.
            </p>
          </div>
          {isDraft ? (
            <div className="notice" role="note">
              <p className="notice__title">Draft — not yet published</p>
              <p className="notice__body">
                These rules are a working draft and may change before launch. The final version
                will be marked as published, with the date it took effect.
              </p>
            </div>
          ) : (
            !book.loading &&
            book.lastUpdated && (
              <p className="rules-updated">
                Last updated <time dateTime={book.lastUpdated}>{formatDay(book.lastUpdated)}</time>
              </p>
            )
          )}
        </div>
      </ParallaxScope>

      <div className="rules-body theme-black">
        <div className="container rules-layout">
          <nav className="rules-index" aria-label="Rule categories">
            <details className="rules-index__mobile">
              <summary>Jump to a section</summary>
              <IndexList active={active} categories={ruleCategories} />
            </details>
            <div className="rules-index__desktop">
              <IndexList active={active} categories={ruleCategories} />
            </div>
          </nav>

          <div className={`rules-content ${book.loading ? '' : 'reveal-stagger'}`}>
            {book.loading && <RulesSkeleton />}
            {ruleCategories.map((category, ci) => (
              <section key={category.id} id={category.id} className="rule-cat" aria-labelledby={`${category.id}-title`}>
                <header className="rule-cat__head">
                  <span className="rule-cat__num" aria-hidden="true">
                    {ci + 1}
                  </span>
                  <div>
                    <h2 id={`${category.id}-title`} className="rule-cat__title">
                      {category.title}
                    </h2>
                    <p className="rule-cat__summary">{category.summary}</p>
                  </div>
                </header>
                <ol role="list" className="rule-list">
                  {category.rules.map((rule, ri) => (
                    <li key={rule.id} id={rule.id} className="rule">
                      <a className="rule__ref" href={`#${rule.id}`} aria-label={`Link to rule ${ci + 1}.${ri + 1}`}>
                        {ci + 1}.{ri + 1}
                      </a>
                      <div>
                        <h3 className="rule__title">{rule.title}</h3>
                        <p className="rule__text">{rule.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <div className="rules-end">
              <p className="rules-end__text">Read them all? You are ready to apply.</p>
              <ApplyLink className="btn btn--primary btn--large">
                Apply now <Arrow />
              </ApplyLink>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function IndexList({ active, categories }) {
  return (
    <ol role="list" className="rules-index__list">
      {categories.map((category, i) => (
        <li key={category.id}>
          <a
            href={`#${category.id}`}
            className="rules-index__link"
            aria-current={active === category.id ? 'location' : undefined}
          >
            <span className="rules-index__num">{i + 1}</span>
            {category.title}
          </a>
        </li>
      ))}
    </ol>
  )
}
