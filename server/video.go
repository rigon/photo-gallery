package main

import (
	"errors"
	"image"
	"log"

	"github.com/3d0c/gmf"
)

// Encoding videos in Raspberry PI 4:
//   ffmpeg -i input.mp4 -c:v h264_v4l2m2m -pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,fps=30" -b:v 25M output.mp4
//   More info: https://www.willusher.io/general/2020/11/15/hw-accel-encoding-rpi4
//
// Video being download twice
//   ffmpeg -i initial-file.mp4 -c copy -movflags +faststart corrected-file.mp4

func GetVideoFrame(srcFileName string) (image.Image, error) {
	var swsctx *gmf.SwsCtx

	// Input
	inputCtx, err := gmf.NewInputCtx(srcFileName)
	if err != nil {
		log.Printf("Error creating context - %s\n", err)
		return nil, err
	}
	defer inputCtx.Free()

	srcVideoStream, err := inputCtx.GetBestStream(gmf.AVMEDIA_TYPE_VIDEO)
	if err != nil {
		log.Printf("No video stream found in '%s'\n", srcFileName)
		return nil, err
	}
	inputCodecCtx := srcVideoStream.CodecCtx()

	// Output
	outputRawCodec, err := gmf.FindEncoder(gmf.AV_CODEC_ID_RAWVIDEO)
	if err != nil {
		log.Fatalf("%s\n", err)
	}

	outputCodecCtx := gmf.NewCodecCtx(outputRawCodec)
	defer gmf.Release(outputCodecCtx)

	outputCodecCtx.SetTimeBase(gmf.AVR{Num: 1, Den: 1})
	outputCodecCtx.SetPixFmt(gmf.AV_PIX_FMT_RGBA).
		SetWidth(inputCodecCtx.Width()).
		SetHeight(inputCodecCtx.Height())
	if outputRawCodec.IsExperimental() {
		outputCodecCtx.SetStrictCompliance(gmf.FF_COMPLIANCE_EXPERIMENTAL)
	}

	if err := outputCodecCtx.Open(nil); err != nil {
		log.Println(err)
		return nil, err
	}
	defer outputCodecCtx.Free()

	inputStream, err := inputCtx.GetStream(srcVideoStream.Index())
	if err != nil {
		log.Printf("Error getting stream - %s\n", err)
		return nil, err
	}
	defer inputStream.Free()

	// convert source pix_fmt into AV_PIX_FMT_RGBA
	// which is set up by codec context above
	swsctx, err = gmf.NewSwsCtx(inputCodecCtx.Width(), inputCodecCtx.Height(), inputCodecCtx.PixFmt(), outputCodecCtx.Width(), outputCodecCtx.Height(), outputCodecCtx.PixFmt(), gmf.SWS_BICUBIC)
	if err != nil {
		log.Printf("Can't convert source pix_fmt into AV_PIX_FMT_RGBA - %s\n", err)
		return nil, err
	}
	defer swsctx.Free()

	var (
		packet *gmf.Packet
		frames []*gmf.Frame
	)

	// Find first packet from the video stream to get the thumbnail from
	for {
		packet, err = inputCtx.GetNextPacket()
		if err != nil {
			if packet != nil {
				packet.Free()
			}
			log.Printf("error getting next packet - %s", err)
			return nil, err
		}

		if packet != nil && packet.StreamIndex() != srcVideoStream.Index() {
			continue
		}

		frames, err = inputStream.CodecCtx().Decode(packet)
		if err != nil {
			log.Printf("Fatal error during decoding - %s\n", err)
			return nil, err
		}

		// Decode() method doesn't treat EAGAIN and EOF as errors
		// it returns empty frames slice instead. Countinue until
		// input EOF or frames received.
		if len(frames) < 1 {
			continue
		}

		break
	}

	if frames, err = gmf.DefaultRescaler(swsctx, frames); err != nil {
		return nil, err
	}

	// Encode frame as raw image
	packets, err := outputCodecCtx.Encode(frames, -1)
	if err != nil {
		log.Fatalf("Error encoding - %s\n", err)
		return nil, err
	}
	if len(packets) == 0 {
		return nil, errors.New("no frames encoded as raw image")
	}

	// Getting the last packet from the decoded frames
	p := packets[len(packets)-1]
	width, height := outputCodecCtx.Width(), outputCodecCtx.Height()
	img := new(image.RGBA)
	img.Pix = p.Data()
	img.Stride = 4 * width
	img.Rect = image.Rect(0, 0, width, height)

	for _, p := range packets {
		p.Free()
	}

	// Cleanup
	for i := range frames {
		frames[i].Free()
	}

	if packet != nil {
		packet.Free()
		packet = nil
	}

	for i := 0; i < inputCtx.StreamsCnt(); i++ {
		st, _ := inputCtx.GetStream(i)
		if st.CodecCtx() != nil {
			st.CodecCtx().Free()
		}
		st.Free()
	}

	return img, nil
}
