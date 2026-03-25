import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangeSelector } from '@/components/charts/TimeRangeSelector';

describe('TimeRangeSelector', () => {
  it('renders 7d, 30d, 90d buttons', () => {
    render(<TimeRangeSelector value="7d" onChange={vi.fn()} />);
    expect(screen.getByText('7 ngày')).toBeInTheDocument();
    expect(screen.getByText('30 ngày')).toBeInTheDocument();
    expect(screen.getByText('90 ngày')).toBeInTheDocument();
  });

  it('calls onChange with correct period when button clicked', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector value="7d" onChange={onChange} />);
    fireEvent.click(screen.getByText('30 ngày'));
    expect(onChange).toHaveBeenCalledWith('30d');
  });

  it('highlights active period button', () => {
    render(<TimeRangeSelector value="30d" onChange={vi.fn()} />);
    const btn = screen.getByText('30 ngày');
    // Active button has variant="default", non-active has variant="outline"
    expect(btn.closest('button')).toHaveAttribute('data-variant', 'default');
  });
});
