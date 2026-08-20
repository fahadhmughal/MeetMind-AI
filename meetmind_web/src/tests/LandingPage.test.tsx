import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { SectionLabel } from '../components/ui/SectionLabel'
import { FeatureCard } from '../features/landing/FeatureCard'
import { StatCard } from '../features/landing/StatCard'
import { FaqAccordionItem } from '../features/landing/FaqAccordionItem'
import { LandingPage } from '../features/landing/LandingPage'
import { Mic, Clock } from 'lucide-react'

describe('Landing Page & Components Unit Tests', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    window.IntersectionObserver = MockIntersectionObserver as any
  })
  it('renders SectionLabel correctly with text and icon', () => {
    render(
      <SectionLabel icon={<Mic data-testid="test-icon" />}>
        Product Features
      </SectionLabel>
    )
    expect(screen.getByText('Product Features')).toBeInTheDocument()
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('renders FeatureCard with icon, title, and description', () => {
    render(
      <FeatureCard
        icon={<Mic data-testid="feat-icon" />}
        title="Real-Time Recording"
        description="Capture clear meeting audio directly."
      />
    )
    expect(screen.getByText('Real-Time Recording')).toBeInTheDocument()
    expect(screen.getByText('Capture clear meeting audio directly.')).toBeInTheDocument()
    expect(screen.getByTestId('feat-icon')).toBeInTheDocument()
  })

  it('renders StatCard with value, label, and illustrative badge', () => {
    render(
      <StatCard
        value="75%"
        label="Minutes Saved"
        subtext="Reduces note taking."
        icon={<Clock data-testid="stat-icon" />}
        isIllustrative={true}
      />
    )
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Minutes Saved')).toBeInTheDocument()
    expect(screen.getByText('Reduces note taking.')).toBeInTheDocument()
    expect(screen.getByText('*Illustrative benchmark')).toBeInTheDocument()
  })

  it('toggles FaqAccordionItem content visibility on button click', () => {
    const handleToggle = vi.fn()
    const { rerender } = render(
      <FaqAccordionItem
        question="Is my meeting data private?"
        answer="Yes, all audio recordings are encrypted."
        isOpen={false}
        onToggle={handleToggle}
      />
    )

    expect(screen.getByText('Is my meeting data private?')).toBeInTheDocument()
    expect(screen.queryByText('Yes, all audio recordings are encrypted.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button'))
    expect(handleToggle).toHaveBeenCalledTimes(1)

    rerender(
      <FaqAccordionItem
        question="Is my meeting data private?"
        answer="Yes, all audio recordings are encrypted."
        isOpen={true}
        onToggle={handleToggle}
      />
    )
    expect(screen.getByText('Yes, all audio recordings are encrypted.')).toBeInTheDocument()
  })

  it('renders full LandingPage and calls onNavigateAuth when Get Started Free is clicked', () => {
    const handleNavigateAuth = vi.fn()
    render(<LandingPage onNavigateAuth={handleNavigateAuth} />)

    expect(screen.getAllByText(/Turn meeting audio into/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Everything you need for effortless meeting intelligence.')).toBeInTheDocument()
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()

    const getStartedBtns = screen.getAllByRole('button', { name: /Get Started Free/i })
    expect(getStartedBtns.length).toBeGreaterThan(0)

    fireEvent.click(getStartedBtns[0])
    expect(handleNavigateAuth).toHaveBeenCalled()
  })
})
