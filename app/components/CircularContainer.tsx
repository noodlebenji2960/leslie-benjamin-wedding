export function CircularContainer({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 579.6 598.6"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cc-grad-1" gradientUnits="userSpaceOnUse" x1="-1098.1627" y1="1601.2797" x2="-527.8578" y2="1601.2797" gradientTransform="matrix(0 -1 1 0 -1308 -504)">
          <stop offset="0" stopColor="#D89D3B" />
          <stop offset="0.1023" stopColor="#DBA141" />
          <stop offset="0.2373" stopColor="#E4AB51" />
          <stop offset="0.3899" stopColor="#F2BD6D" />
          <stop offset="0.5" stopColor="#FFCC85" />
          <stop offset="0.5765" stopColor="#FCC880" />
          <stop offset="0.6708" stopColor="#F4BC71" />
          <stop offset="0.7744" stopColor="#E6A958" />
          <stop offset="0.8848" stopColor="#D38E35" />
          <stop offset="1" stopColor="#BA6B08" />
        </linearGradient>
        <linearGradient id="cc-grad-2" gradientUnits="userSpaceOnUse" x1="-1462.8831" y1="1618.7419" x2="-875.8192" y2="1618.7419" gradientTransform="matrix(-0.2707,-0.9627,0.9627,-0.2707,-1588.6099,-383.1355)">
          <stop offset="0" stopColor="#D89D3B" />
          <stop offset="0.1023" stopColor="#DBA141" />
          <stop offset="0.2373" stopColor="#E4AB51" />
          <stop offset="0.3899" stopColor="#F2BD6D" />
          <stop offset="0.5" stopColor="#FFCC85" />
          <stop offset="0.5765" stopColor="#FCC880" />
          <stop offset="0.6708" stopColor="#F4BC71" />
          <stop offset="0.7744" stopColor="#E6A958" />
          <stop offset="0.8848" stopColor="#D38E35" />
          <stop offset="1" stopColor="#BA6B08" />
        </linearGradient>
        <linearGradient id="cc-grad-3" gradientUnits="userSpaceOnUse" x1="-707.9463" y1="1449.2174" x2="-126.4161" y2="1449.2174" gradientTransform="matrix(0.3105,-0.9506,0.9506,0.3105,-961.4344,-541.2914)">
          <stop offset="0" stopColor="#D89D3B" />
          <stop offset="0.1023" stopColor="#DBA141" />
          <stop offset="0.2373" stopColor="#E4AB51" />
          <stop offset="0.3899" stopColor="#F2BD6D" />
          <stop offset="0.5" stopColor="#FFCC85" />
          <stop offset="0.5765" stopColor="#FCC880" />
          <stop offset="0.6708" stopColor="#F4BC71" />
          <stop offset="0.7744" stopColor="#E6A958" />
          <stop offset="0.8848" stopColor="#D38E35" />
          <stop offset="1" stopColor="#BA6B08" />
        </linearGradient>
      </defs>

      {/* Layer 1 — thick middle polygon */}
      <g className="cc-layer-1">
        <polygon
          fill="none"
          stroke="url(#cc-grad-2)"
          strokeWidth="5.3687"
          strokeMiterlimit="10"
          points="4.8,232.7 83.5,512.3 364.9,584 567.7,376.1 489.1,96.5 207.7,24.8"
        />
      </g>

      {/* Layer 2 — thin inner polygon */}
      <g className="cc-layer-2">
        <polygon
          fill="none"
          stroke="url(#cc-grad-3)"
          strokeWidth="1.7896"
          strokeMiterlimit="10"
          points="93.1,89.6 3.2,365.1 196.7,580.7 480.2,520.9 570.2,245.5 376.6,29.8"
        />
      </g>

      {/* Layer 3 — thin outer polygon */}
      <g className="cc-layer-3">
        <polygon
          fill="none"
          stroke="url(#cc-grad-1)"
          strokeWidth="1.7896"
          strokeMiterlimit="10"
          points="47.2,167 47.2,451.1 293.3,593.1 539.3,451.1 539.3,167 293.3,24.9"
        />
      </g>
    </svg>
  );
}
