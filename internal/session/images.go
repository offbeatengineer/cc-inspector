package session

import (
	"encoding/base64"
	"fmt"
	"strconv"
)

// DecodeImage looks up the image block at (messageUUID, blockIndex) inside a
// session file and returns raw bytes + media type.
func DecodeImage(path, messageUUID, blockIndexStr string) (data []byte, mediaType string, err error) {
	idx, err := strconv.Atoi(blockIndexStr)
	if err != nil {
		return nil, "", fmt.Errorf("invalid block index")
	}
	msgs, err := ParseFile(path)
	if err != nil {
		return nil, "", err
	}
	for _, m := range msgs {
		if m.UUID != messageUUID || m.Message == nil {
			continue
		}
		if idx < 0 || idx >= len(m.Message.Content) {
			return nil, "", fmt.Errorf("image block index out of range")
		}
		// Re-parse the block from Raw because we zeroed Source during transform.
		var block struct {
			Type   string       `json:"type"`
			Source *ImageSource `json:"source"`
		}
		if err := decodeRaw(m.Message.Content[idx].Raw, &block); err != nil {
			return nil, "", err
		}
		if block.Source == nil || block.Source.Data == "" {
			return nil, "", fmt.Errorf("no image source")
		}
		data, err := base64.StdEncoding.DecodeString(block.Source.Data)
		if err != nil {
			return nil, "", err
		}
		mt := block.Source.MediaType
		if mt == "" {
			mt = "application/octet-stream"
		}
		return data, mt, nil
	}
	return nil, "", fmt.Errorf("message not found")
}
