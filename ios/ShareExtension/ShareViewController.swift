import receive_sharing_intent

class ShareViewController: RSIShareViewController {

    // Skip the built-in compose UI: jump straight to the app so the user
    // picks the destination chat from the in-app pick-mode banner.
    override func shouldAutoRedirect() -> Bool {
        return true
    }
}
