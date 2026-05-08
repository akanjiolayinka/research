export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-violet-400"
          style={{
            animation: "blink 1.2s ease-in-out infinite",
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}
