import Icon from "../Icon";
import Shell from "../Shell";

const upcoming = [
    {
        title: "Stickman animations",
        description: "Tell a story with animated stick figures.",
        image: "stickman",
    },
    {
        title: "Social media video",
        description: "Create short videos for Reels, TikTok, and Shorts.",
        image: "social-media",
    },
];

export default function CreateOptions() {
    return (
        <Shell
            title="Create a video"
            description="Choose a workflow to start your next video."
        >
            <ul className="create-options" aria-label="Video types" role="list">
                <li>
                    <a
                        className="create-option create-option-available"
                        href="/create/from-scratch"
                        aria-labelledby="create-from-scratch"
                        aria-describedby="create-from-scratch-description"
                    >
                        <div className="create-option-preview">
                            <img src="/workflows/from-scratch.webp" alt="" width={800} height={450} />
                        </div>
                        <h2 id="create-from-scratch">Video from scratch</h2>
                        <p id="create-from-scratch-description">
                            Start with your narration, find footage, and edit the result.
                        </p>
                        <span className="create-option-start" aria-hidden="true">
                            Start creating <Icon name="arrowRight" size={15} />
                        </span>
                    </a>
                </li>
                <li>
                    <a className="create-option create-option-available" href="/create/motion-graphics"
                        aria-labelledby="create-motion-graphics" aria-describedby="create-motion-graphics-description">
                        <div className="create-option-preview">
                            <img src="/workflows/motion-graphics.webp" alt="" width={800} height={450} />
                        </div>
                        <h2 id="create-motion-graphics">Motion graphics video</h2>
                        <p id="create-motion-graphics-description">Animate text and shapes from a brief or visual reference.</p>
                        <span className="create-option-start" aria-hidden="true">
                            Start creating <Icon name="arrowRight" size={15} />
                        </span>
                    </a>
                </li>
                {upcoming.map(({ title, description, image }) => (
                    <li key={title} className="create-option">
                        <div className="create-option-preview">
                            <img src={`/workflows/${image}.webp`} alt="" width={800} height={450} />
                            <span className="create-option-status">Coming soon</span>
                        </div>
                        <h2>{title}</h2>
                        <p>{description}</p>
                    </li>
                ))}
            </ul>
        </Shell>
    );
}
