import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/data/status-badge';
import { MetricCard } from '../components/data/metric-card';

describe('DeVoc UI Primitives & Design System', () => {
  describe('Button component', () => {
    it('renders with children and responds to click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Submit Action</Button>);

      const btn = screen.getByRole('button', { name: /Submit Action/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button and displays loader when isLoading is true', () => {
      render(<Button isLoading>Save Changes</Button>);

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });

    it('applies primary variant styling', () => {
      render(<Button variant="primary">Confirm</Button>);
      const btn = screen.getByRole('button', { name: /Confirm/i });
      expect(btn.className).toContain('bg-devoc-brand');
    });
  });

  describe('Input component', () => {
    it('renders label, input, and updates value', () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="Corporate Email"
          placeholder="name@devoc.io"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Corporate Email')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('name@devoc.io');
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'test@devoc.io' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders accessible error message and marks aria-invalid', () => {
      render(
        <Input
          label="Password"
          error="Password must contain at least 8 characters"
        />
      );

      const input = screen.getByLabelText(/Password/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Password must contain at least 8 characters'
      );
    });
  });

  describe('Badge & StatusBadge components', () => {
    it('renders badge with correct text content', () => {
      render(<Badge variant="brand">Enterprise</Badge>);
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });

    it('normalizes status string to friendly label in StatusBadge', () => {
      render(<StatusBadge status="in_review" />);
      expect(screen.getByText('In Review')).toBeInTheDocument();
    });
  });

  describe('MetricCard component', () => {
    it('renders label, tabular value, and subtext', () => {
      render(
        <MetricCard
          label="Hours Logged"
          value="40h"
          subtext="Target met"
          trend={{ value: '+5h', direction: 'up', isPositive: true }}
        />
      );

      expect(screen.getByText('Hours Logged')).toBeInTheDocument();
      expect(screen.getByText('40h')).toBeInTheDocument();
      expect(screen.getByText('Target met')).toBeInTheDocument();
      expect(screen.getByText('+5h')).toBeInTheDocument();
    });
  });
});
