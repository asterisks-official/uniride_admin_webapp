import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Rides</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Requests</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Trust Score</h3>
            <p className="text-3xl font-bold text-gray-900">-</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/users"
                className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 font-medium transition-colors"
              >
                Manage Users
              </Link>
              <Link
                href="/rides"
                className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 font-medium transition-colors"
              >
                View Rides
              </Link>
              <Link
                href="/requests"
                className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 font-medium transition-colors"
              >
                Review Requests
              </Link>
              <Link
                href="/trust"
                className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 font-medium transition-colors"
              >
                Trust Scores
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-500 text-sm">Activity feed coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
