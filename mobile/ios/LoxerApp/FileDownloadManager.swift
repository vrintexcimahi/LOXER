import UIKit

class FileDownloadManager: NSObject, URLSessionDownloadDelegate {
    static let shared = FileDownloadManager()
    private var completionHandlers: [Int: (URL?, String?) -> Void] = [:]

    private override init() {
        super.init()
    }

    func downloadFile(from urlString: String, fileName: String? = nil, completion: @escaping (URL?, String?) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(nil, "URL tidak valid")
            return
        }

        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        let task = session.downloadTask(with: url)
        completionHandlers[task.taskIdentifier] = completion
        task.resume()
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let suggestedName = downloadTask.response?.suggestedFilename ?? "LOXER_Download"
        let tempDir = FileManager.default.temporaryDirectory
        let destinationURL = tempDir.appendingPathComponent(suggestedName)

        try? FileManager.default.removeItem(at: destinationURL)
        do {
            try FileManager.default.moveItem(at: location, to: destinationURL)
            DispatchQueue.main.async {
                self.completionHandlers[downloadTask.taskIdentifier]?(destinationURL, nil)
                self.completionHandlers.removeValue(forKey: downloadTask.taskIdentifier)
            }
        } catch {
            DispatchQueue.main.async {
                self.completionHandlers[downloadTask.taskIdentifier]?(nil, error.localizedDescription)
                self.completionHandlers.removeValue(forKey: downloadTask.taskIdentifier)
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            DispatchQueue.main.async {
                self.completionHandlers[task.taskIdentifier]?(nil, error.localizedDescription)
                self.completionHandlers.removeValue(forKey: task.taskIdentifier)
            }
        }
    }

    func presentShareSheet(for fileURL: URL, from viewController: UIViewController) {
        let activityVC = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = viewController.view
            popover.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        viewController.present(activityVC, animated: true)
    }
}
