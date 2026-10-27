// Styles: .fq-coins in theme-pop.css (loaded for every page, so tests can import this file).

/* Coins for the dimes-and-pennies lesson: dimes (10¢, a tenth of a dollar) are bigger silver coins, pennies (1¢, a
   hundredth) smaller copper ones. Each coin says its value, so counting them is the child's work. */
/** One coin, as in practice: a copper penny marked 1¢ or a silver dime marked 10¢ (`big` for a Learn page's lone coin). */
export function Coin({ coin, big = false }: { coin: 'penny' | 'dime'; big?: boolean }) {
  return <span className={`fq-coin ${coin === 'dime' ? 'is-dime' : 'is-penny'} ${big ? 'is-big' : ''}`} aria-hidden="true">{coin === 'dime' ? '10¢' : '1¢'}</span>;
}

export function CoinsPicture({ dimes, pennies }: { dimes: number; pennies: number }) {
  const said = [dimes && `${dimes} ${dimes === 1 ? 'dime' : 'dimes'}`, pennies && `${pennies} ${pennies === 1 ? 'penny' : 'pennies'}`].filter(Boolean).join(' and ');
  return (
    <div className="fq-coins" role="img" aria-label={said || 'No coins'} data-testid="coins-picture">
      {Array.from({ length: dimes }, (_, i) => <Coin coin="dime" key={`d${i}`} />)}
      {Array.from({ length: pennies }, (_, i) => <Coin coin="penny" key={`p${i}`} />)}
    </div>
  );
}
