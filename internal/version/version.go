package version

var (
	// Version is the semver string, populated via -ldflags at release time.
	Version = "dev"
	// Commit is the git SHA, populated via -ldflags at release time.
	Commit = "none"
	// Date is the build date, populated via -ldflags at release time.
	Date = "unknown"
)

type Details struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Date    string `json:"date"`
}

func Info() Details {
	return Details{Version: Version, Commit: Commit, Date: Date}
}
