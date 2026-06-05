import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the golf glove finder title', () => {
  render(<App />);
  expect(screen.getByText(/golf glove finder/i)).toBeInTheDocument();
});
 