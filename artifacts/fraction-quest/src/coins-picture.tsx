// Styles: .fq-coins in theme-pop.css (loaded for every page, so tests can import this file).

/* Coins for the dimes-and-pennies lesson: dimes (10¢, a tenth of a dollar) are bigger silver coins, pennies (1¢, a
   hundredth) smaller copper ones. Each coin says its value, so counting them is the child's work. */
export function CoinsPicture({ dimes, pennies }: { dimes: number; pennies: number }) {
  const said = [dimes && `${dimes} ${dimes === 1 ? 'dime' : 'dimes'}`, pennies && `${pennies} ${pennies === 1 ? 'penny' : 'pennies'}`].filter(Boolean).join(' and ');
  return (
    <div className="fq-coins" role="img" aria-label={said || 'No coins'} data-testid="coins-picture">
      {Array.from({ length: dimes }, (_, i) => <span className="fq-coin is-dime" key={`d${i}`} aria-hidden="true">10¢</span>)}
      {Array.from({ length: pennies }, (_, i) => <span className="fq-coin is-penny" key={`p${i}`} aria-hidden="true">1¢</span>)}
    </div>
  );
}
