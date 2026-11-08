import Icon from "../Icon";
import Shell from "../Shell";

const upcoming = [
    {
        title: "Motion graphics video",
        description: "Animate text, shapes, and visuals for explainers and intros.",
        icon: "sparkles",
    },
    {
        title: "Stickman animations",
        description: "Tell a story with animated stick figures.",
        icon: "stickman",
    },
    {
        title: "Social media video",
        description: "Create short videos for Reels, TikTok, and Shorts.",
        icon: "mobile",
    },
];

export default function CreateOptions() {
    return (
        <Shell
            title="Create a video"
            description="Choose what you want to make."
        >
            <ul className="create-options" aria-label="Video types">
                <li>
                    <a
                        className="panel create-option create-option-available"
                        href="/create/from-scratch"
                        aria-labelledby="create-from-scratch"
                        aria-describedby="create-from-scratch-description"
                    >
                        <span className="create-option-icon">
                            <Icon name="film" size={22} />
                        </span>
                        <h2 id="create-from-scratch">Video from scratch</h2>
                        <p id="create-from-scratch-description">
                            Start with your narration, find footage, and edit the result.
                        </p>
                        <span className="create-option-start" aria-hidden="true">
                            Start creating <Icon name="arrowRight" size={16} />
                        </span>
                    </a>
                </li>
                {upcoming.map(({ title, description, icon }) => (
                    <li key={title} className="panel create-option">
                        <span className="create-option-icon">
                            <Icon name={icon} size={22} />
                        </span>
                        <h2>{title}</h2>
                        <p>{description}</p>
                        <span className="create-option-status">Coming soon</span>
                    </li>
                ))}
            </ul>
        </Shell>
    );
}
