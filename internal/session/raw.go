package session

import "encoding/json"

func decodeRaw(data json.RawMessage, v any) error {
	if len(data) == 0 {
		return nil
	}
	return json.Unmarshal(data, v)
}
