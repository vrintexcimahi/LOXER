import UIKit

class MaintenanceViewController: UIViewController {

    var message: String?
    var onRetry: (() -> Void)?

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Sistem Sedang Ditingkatkan"
        label.textColor = .white
        label.font = UIFont.systemFont(ofSize: 22, weight: .bold)
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    private let messageLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textColor = UIColor(red: 136/255, green: 146/255, blue: 176/255, alpha: 1)
        label.font = UIFont.systemFont(ofSize: 15, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    private let retryButton: UIButton = {
        let btn = UIButton(type: .system)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.setTitle("Coba Lagi", for: .normal)
        btn.setTitleColor(UIColor(red: 10/255, green: 25/255, blue: 47/255, alpha: 1), for: .normal)
        btn.backgroundColor = UIColor(red: 0/255, green: 217/255, blue: 255/255, alpha: 1)
        btn.layer.cornerRadius = 8
        btn.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        return btn
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 10/255, green: 25/255, blue: 47/255, alpha: 1)

        messageLabel.text = message ?? "LOXER sedang melakukan peningkatan sistem untuk pengalaman yang lebih baik. Silakan coba beberapa saat lagi."

        view.addSubview(titleLabel)
        view.addSubview(messageLabel)
        view.addSubview(retryButton)

        retryButton.addTarget(self, action: #selector(handleRetry), for: .touchUpInside)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -60),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),

            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            messageLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            messageLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),

            retryButton.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 32),
            retryButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            retryButton.widthAnchor.constraint(equalToConstant: 200),
            retryButton.heightAnchor.constraint(equalToConstant: 48)
        ])
    }

    @objc private func handleRetry() {
        onRetry?()
    }
}
