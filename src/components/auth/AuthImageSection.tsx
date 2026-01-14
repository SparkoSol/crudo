import authUIBgImage from "../../assets/auth_pages_bg.jpg";

interface AuthImageSectionProps {
  title: string;
  description: string;
}

export const AuthImageSection = ({
  title,
  description,
}: AuthImageSectionProps) => {
  return (
    <div
      className="hidden md:block relative"
      style={{
        backgroundImage: `url(${authUIBgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-blue-900/30 p-10 flex flex-col justify-end">
        <h2 className="text-white text-3xl font-bold leading-snug">{title}</h2>
        <p className="text-white/80 mt-4 text-sm">{description}</p>
      </div>
    </div>
  );
};
